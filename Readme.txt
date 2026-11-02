503073 - WEB PROGRAMMING & APPLICATIONS - FINAL PROJECT
Notes application (Laravel + React), run locally with Docker Compose

Link github: https://github.com/giavietchippy/Web-Programing-Final

TEAM
- 524H0041 - Trần Đỗ Quốc Anh
- 524H0075 - Nguyễn Gia Việt
- 524H0139 - Phan Hoài An

DEPLOYMENT
The application is not hosted online. It runs on the instructor's machine
with Docker Compose, as allowed by the assignment.

REQUIREMENTS
- Docker with Docker Compose v2
  (Docker Desktop on Windows/macOS, or Docker Engine + Compose plugin on Linux)
- Internet access for the first build (downloads images and packages)
- Free ports 8080 (application) and 8025 (mail inbox). To use other ports,
  change WEB_PORT and MAILPIT_PORT in the .env file BEFORE starting.

HOW TO RUN
1. Open a terminal in this folder (the one that contains docker-compose.yml).
2. Create the settings file:
     Windows:        copy .env.example .env
     Linux / macOS:  cp .env.example .env
3. Build and start everything:
     docker compose up --build
   The first run takes several minutes. It is ready when the log stops
   printing new lines and you can open the address below.
   (Add -d to run in the background.)
4. Open the application:  http://localhost:8080
5. Open the test mail inbox:  http://localhost:8025

No npm install, composer install or database setup is needed. Everything
runs inside the containers, and the database tables and demo accounts are
created automatically on first start.

ACCOUNTS WITH PRE-LOADED DATA
  alice@example.com   password: Demo@12345   (activated)
  bob@example.com     password: Demo@12345   (activated)
  carol@example.com   password: Demo@12345   (NOT activated: shows the
                                              activation banner)

EMAIL
The application never sends real email. All messages (account activation,
password reset, share notifications) appear in the mail inbox at
http://localhost:8025. Open activation and reset links using the same
address as the application (http://localhost:8080, or your chosen port).

STOP AND RESET
  Stop (data is kept):                 docker compose down
  Stop and delete ALL data (fresh DB): docker compose down -v

TROUBLESHOOTING
- "port is already allocated": another program uses the port. Change
  WEB_PORT or MAILPIT_PORT in .env, then run docker compose up --build again.
- Page not available right after start: wait about 30 seconds for the database
  and migrations, then refresh.
- See logs:  docker compose logs app
