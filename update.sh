cd ~/check_in_VIL/
git pull
sudo cp ~/check_in_VIL/* /var/www/scan.horacioglz.com/
sudo nginx -t && sudo systemctl reload nginx
