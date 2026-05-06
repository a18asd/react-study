# react-study

Spring Boot backend and React TypeScript frontend study project.

## Project Structure

- `backend`: Spring Boot REST API
- `frontend`: Vite + React + TypeScript app

## Run Backend

```bash
cd backend
mvn spring-boot:run
```

The API runs at `http://localhost:8080`.

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies `/api` calls to the backend.

In IntelliJ IDEA, select the `Frontend Dev` run configuration and click Run.

## API

- `GET /api/hello`: returns a sample message from Spring Boot
