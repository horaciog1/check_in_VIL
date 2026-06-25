cd ~/check_in_VIL/
git pull
sudo cp *.html *.js *.css *.wav *.ico /var/www/scan.horacioglz.com/
sudo nginx -t && sudo systemctl reload nginx
