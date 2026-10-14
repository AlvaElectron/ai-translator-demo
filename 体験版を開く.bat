@echo off
chcp 65001 > nul
rem AI-translator 体験版を、この PC だけで開く
cd /d "%~dp0"
set PORT=8000
echo.
echo  AI-translator 体験版を開きます。
echo  ブラウザが開いたら、そのままお使いください（初回は、数十秒かかります）。
echo  終わるときは、この黒い画面を閉じてください。
echo.
start "" "http://localhost:%PORT%/"
where py > nul 2>&1 && (py -3 serve.py %PORT% & goto :eof)
where python > nul 2>&1 && (python serve.py %PORT% & goto :eof)
echo  Python が見つかりません。https://www.python.org/ から Python 3 を入れてください。
pause