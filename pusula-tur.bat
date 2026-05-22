@echo off
chcp 65001 >nul
title Pusula Tur
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0tur.ps1"
