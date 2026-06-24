@echo off
title HealthOS Server

echo Starting HealthOS API server...
start "HealthOS API" /min cmd /c "cd /d C:\Users\weavl\Desktop\HealthTracker\server && npm run dev"

echo Starting HealthOS client...
start "HealthOS Client" /min cmd /c "cd /d C:\Users\weavl\Desktop\HealthTracker\client && npm run dev"

echo HealthOS is running!
echo   API:    http://localhost:3001
echo   Client: http://localhost:5173
