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

    # TLS hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    root /var/www/scan.horacioglz.com;
    index index.html;

    # Block hidden files (.env, .git, etc.)
    location ~ /\. {
        deny all;
    }

    location / {
        try_files $uri $uri/ =404;

        # Rate limiting — defined in conf.d/rate-limit.conf
        limit_req zone=scan burst=10 nodelay;

        # Prevent clickjacking (CSP frame-ancestors is the modern way; X-Frame-Options for legacy)
        add_header X-Frame-Options "DENY" always;

        # Force HTTPS for 1 year — no preload to keep flexibility
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Send referrer only to same origin
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Restrict browser features — only camera needed by this app
        add_header Permissions-Policy "camera=(self), microphone=(), geolocation=(), payment=()" always;

        # Prevent MIME sniffing
        add_header X-Content-Type-Options "nosniff" always;

        # Legacy XSS filter (belt-and-suspenders, mostly for IE)
        add_header X-XSS-Protection "1; mode=block" always;

        add_header Content-Security-Policy "
            default-src 'self';
            script-src 'self' https://unpkg.com https://script.google.com https://script.googleusercontent.com;
            connect-src 'self' https://script.google.com https://script.googleusercontent.com;
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
            style-src-elem 'self' https://fonts.googleapis.com;
            font-src 'self' https://fonts.gstatic.com;
            media-src 'self';
            img-src 'self' data:;
            frame-ancestors 'none';
            base-uri 'self';
            form-action 'none';
        " always;
    }

}
