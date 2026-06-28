server {
    listen 80;
    server_name scan.horacioglz.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name scan.horacioglz.com;

    ssl_certificate /etc/ssl/horacioglz/chain.crt;
    ssl_certificate_key /etc/ssl/horacioglz/_.horacioglz.com_private_key.key;
    ssl_trusted_certificate /etc/ssl/horacioglz/chain.crt;

    root /var/www/scan.horacioglz.com;
    index index.html;

    location ~ /\. {
        deny all;
    }

    location / {
        try_files $uri $uri/ =404;

        add_header Content-Security-Policy "
             default-src 'self';
             script-src 'self' https://unpkg.com https://script.google.com https://script.googleusercontent.com;
             connect-src 'self' https://script.google.com https://script.googleusercontent.com;
             style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
             style-src-elem 'self' https://fonts.googleapis.com;
             font-src 'self' https://fonts.gstatic.com;
             media-src 'self';
        " always;

        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

}
