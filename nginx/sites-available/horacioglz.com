server {
    listen 80;
    server_name horacioglz.com www.horacioglz.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers "ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256";
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    server_name horacioglz.com www.horacioglz.com;

    ssl_certificate /etc/ssl/horacioglz/chain.crt;
    ssl_certificate_key /etc/ssl/horacioglz/_.horacioglz.com_private_key.key;
    ssl_trusted_certificate /etc/ssl/horacioglz/chain.crt;

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "geolocation=(), microphone=()" always;

    limit_req zone=botzone burst=5;


    root /var/www/html;
    index index.html;

    # Block WordPress scanner bots
    location ~* /(wp-admin|wp-login|wp-content|wordpress|xmlrpc\.php) {
        return 444;  # Drop connection silently
    }

    location ~ /\.git {
        deny all;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
