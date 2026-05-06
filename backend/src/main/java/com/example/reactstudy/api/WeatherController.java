package com.example.reactstudy.api;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class WeatherController {

    private static final Logger log = LoggerFactory.getLogger(WeatherController.class);
    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HHmm");
    private static final double EARTH_RADIUS = 6371.00877;
    private static final double GRID_SIZE = 5.0;
    private static final double SLAT1 = 30.0;
    private static final double SLAT2 = 60.0;
    private static final double OLON = 126.0;
    private static final double OLAT = 38.0;
    private static final double XO = 43.0;
    private static final double YO = 136.0;
    private static final String DONG = "\uC2DC\uD765\uB3D9";
    private static final String PLACE = "\uD310\uAD50 \uAE00\uB85C\uBC8C\uBE44\uC988\uC13C\uD130";
    private static final String PANGYO_ADDRESS =
        "\uACBD\uAE30\uB3C4 \uC131\uB0A8\uC2DC \uC218\uC815\uAD6C \uCC3D\uC5C5\uB85C 43";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String serviceKey;

    public WeatherController(ObjectMapper objectMapper, @Value("${weather.kma.service-key:}") String serviceKey) {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
        this.serviceKey = serviceKey;
    }

    @GetMapping("/weather")
    public WeatherResponse weather(
        @RequestParam(defaultValue = "37.4119") double lat,
        @RequestParam(defaultValue = "127.0988") double lon
    ) throws IOException, InterruptedException {
        WeatherLocation location = weatherLocation(lat, lon);
        if (serviceKey == null || serviceKey.isBlank()) {
            return fallbackWeather(location, "KMA_SERVICE_KEY is not configured");
        }

        ForecastBase forecastBase = latestUltraShortBaseTime();
        URI uri = weatherUri(forecastBase, location);

        HttpRequest request = HttpRequest.newBuilder(uri).GET().build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            String reason = "KMA request failed: " + response.statusCode();
            log.warn(reason);
            return fallbackWeather(location, reason);
        }

        return parseWeather(response.body(), forecastBase, location);
    }

    private URI weatherUri(ForecastBase forecastBase, WeatherLocation location) {
        String normalizedKey = serviceKey.contains("%")
            ? serviceKey
            : URLEncoder.encode(serviceKey, StandardCharsets.UTF_8);

        return URI.create(
            "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst"
                + "?serviceKey=" + normalizedKey
                + "&pageNo=1"
                + "&numOfRows=80"
                + "&dataType=JSON"
                + "&base_date=" + forecastBase.baseDate()
                + "&base_time=" + forecastBase.baseTime()
                + "&nx=" + location.nx()
                + "&ny=" + location.ny()
        );
    }

    private WeatherResponse parseWeather(String body, ForecastBase forecastBase, WeatherLocation location)
        throws IOException {
        JsonNode root = objectMapper.readTree(body);
        JsonNode header = root.path("response").path("header");
        if (!"00".equals(header.path("resultCode").asText())) {
            String reason = header.path("resultMsg").asText("KMA returned an error");
            log.warn("KMA returned fallback response: {}", reason);
            return fallbackWeather(location, reason);
        }

        List<JsonNode> items = root.path("response").path("body").path("items").path("item").findValues("category");
        if (items.isEmpty()) {
            String reason = "KMA response has no forecast items";
            log.warn(reason);
            return fallbackWeather(location, reason);
        }

        Map<String, JsonNode> selected = new HashMap<>();
        for (JsonNode item : root.path("response").path("body").path("items").path("item")) {
            String category = item.path("category").asText();
            if (!selected.containsKey(category)) {
                selected.put(category, item);
            }
        }

        int temperature = selectedValue(selected, "T1H", 24);
        int humidity = selectedValue(selected, "REH", 54);
        int skyCode = selectedValue(selected, "SKY", 1);
        int precipitationCode = selectedValue(selected, "PTY", 0);
        String condition = conditionLabel(skyCode, precipitationCode);

        return new WeatherResponse(
            location.dong(),
            location.place(),
            location.address(),
            location.lat(),
            location.lon(),
            location.nx(),
            location.ny(),
            temperature,
            humidity,
            condition,
            iconFor(skyCode, precipitationCode),
            forecastBase.baseDate(),
            forecastBase.baseTime(),
            "KMA",
            null
        );
    }

    private int selectedValue(Map<String, JsonNode> selected, String category, int fallback) {
        JsonNode item = selected.get(category);
        if (item == null) {
            return fallback;
        }
        return Math.round(Float.parseFloat(item.path("fcstValue").asText(String.valueOf(fallback))));
    }

    private ForecastBase latestUltraShortBaseTime() {
        LocalDateTime now = LocalDateTime.now(KOREA_ZONE).minusMinutes(45);
        return new ForecastBase(now.format(DATE_FORMAT), now.format(TIME_FORMAT).substring(0, 2) + "30");
    }

    private WeatherResponse fallbackWeather(WeatherLocation location, String reason) {
        return new WeatherResponse(
            location.dong(),
            location.place(),
            location.address(),
            location.lat(),
            location.lon(),
            location.nx(),
            location.ny(),
            24,
            54,
            "\uB9D1\uC74C",
            "sun",
            LocalDateTime.now(KOREA_ZONE).format(DATE_FORMAT),
            "fallback",
            "fallback",
            reason
        );
    }

    private WeatherLocation weatherLocation(double lat, double lon) {
        GridPoint gridPoint = toGridPoint(lat, lon);
        boolean pangyo = Math.abs(lat - 37.4119) < 0.01 && Math.abs(lon - 127.0988) < 0.01;
        return new WeatherLocation(
            pangyo ? DONG : "\uC9C0\uB3C4 \uC911\uC2EC",
            pangyo ? PLACE : "\uC774\uB3D9\uD55C \uC9C0\uB3C4 \uC911\uC2EC",
            pangyo ? PANGYO_ADDRESS : String.format("%.5f, %.5f", lat, lon),
            lat,
            lon,
            gridPoint.nx(),
            gridPoint.ny()
        );
    }

    private GridPoint toGridPoint(double lat, double lon) {
        double degrad = Math.PI / 180.0;
        double re = EARTH_RADIUS / GRID_SIZE;
        double slat1 = SLAT1 * degrad;
        double slat2 = SLAT2 * degrad;
        double olon = OLON * degrad;
        double olat = OLAT * degrad;

        double sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
        sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

        double sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
        sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;

        double ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
        ro = re * sf / Math.pow(ro, sn);

        double ra = Math.tan(Math.PI * 0.25 + lat * degrad * 0.5);
        ra = re * sf / Math.pow(ra, sn);

        double theta = lon * degrad - olon;
        if (theta > Math.PI) {
            theta -= 2.0 * Math.PI;
        }
        if (theta < -Math.PI) {
            theta += 2.0 * Math.PI;
        }
        theta *= sn;

        int nx = (int) Math.floor(ra * Math.sin(theta) + XO + 0.5);
        int ny = (int) Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
        return new GridPoint(nx, ny);
    }

    private String conditionLabel(int skyCode, int precipitationCode) {
        if (precipitationCode == 1 || precipitationCode == 4) {
            return "\uBE44";
        }
        if (precipitationCode == 2) {
            return "\uBE44/\uB208";
        }
        if (precipitationCode == 3) {
            return "\uB208";
        }
        if (skyCode == 3) {
            return "\uAD6C\uB984\uB9CE\uC74C";
        }
        if (skyCode == 4) {
            return "\uD750\uB9BC";
        }
        return "\uB9D1\uC74C";
    }

    private String iconFor(int skyCode, int precipitationCode) {
        if (precipitationCode == 1 || precipitationCode == 4) {
            return "rain";
        }
        if (precipitationCode == 2 || precipitationCode == 3) {
            return "snow";
        }
        if (skyCode == 3) {
            return "cloud-sun";
        }
        if (skyCode == 4) {
            return "cloud";
        }
        return "sun";
    }

    private record ForecastBase(String baseDate, String baseTime) {
    }

    private record GridPoint(int nx, int ny) {
    }

    private record WeatherLocation(
        String dong,
        String place,
        String address,
        double lat,
        double lon,
        int nx,
        int ny
    ) {
    }

    public record WeatherResponse(
        String dong,
        String place,
        String address,
        double latitude,
        double longitude,
        int nx,
        int ny,
        int temperature,
        int humidity,
        String condition,
        String icon,
        String baseDate,
        String baseTime,
        String source,
        String notice
    ) {
    }
}
