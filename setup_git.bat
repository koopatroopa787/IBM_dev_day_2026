@echo off
echo STARTING GIT SETUP > git_setup.log
git --version >> git_setup.log 2>&1
if %errorlevel% neq 0 (
    echo GIT NOT FOUND >> git_setup.log
    exit /b 1
)

echo INITIALIZING GIT >> git_setup.log
git init >> git_setup.log 2>&1

echo ADDING FILES >> git_setup.log
git add . >> git_setup.log 2>&1

echo COMMITTING >> git_setup.log
git commit -m "Initial commit" >> git_setup.log 2>&1

echo RENAMING BRANCH >> git_setup.log
git branch -M main >> git_setup.log 2>&1

echo ADDING REMOTE >> git_setup.log
git remote add origin https://github.com/koopatroopa787/IBM_dev_day_2026.git >> git_setup.log 2>&1

echo PUSHING >> git_setup.log
git push -u origin main >> git_setup.log 2>&1

echo DONE >> git_setup.log
type git_setup.log
