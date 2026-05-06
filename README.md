# react-study

Spring Boot backend and React TypeScript frontend study project.

## Project Structure

- `backend`: Spring Boot REST API
- `frontend`: Vite + React + TypeScript app

## IntelliJ IDEA

Open the repository root folder or root `pom.xml`, not only `backend/pom.xml`.

```text
react-study
├─ pom.xml
├─ backend
└─ frontend
```

The root Maven project imports `backend` as a module while keeping `frontend` visible in the project tree.

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
