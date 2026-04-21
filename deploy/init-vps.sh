#!/usr/bin/env bash
# РАЗУМ — первичная настройка production VPS.
#
# Предполагается свежий Ubuntu 22.04 / Debian 12.
# Запускать от root (или через sudo) один раз при первом заходе.
#
#   scp deploy/init-vps.sh root@vps:/root/
#   ssh root@vps 'bash /root/init-vps.sh'
#
# Скрипт идемпотентен — повторный запуск не ломает систему.

set -euo pipefail

### --- settings ----------------------------------------------------------

DEPLOY_USER="${DEPLOY_USER:-razum}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-}"   # содержимое id_ed25519.pub, обязательно
SSH_PORT="${SSH_PORT:-22}"
TIMEZONE="${TIMEZONE:-Europe/Berlin}"
DOCKER_COMPOSE_VERSION="${DOCKER_COMPOSE_VERSION:-v2.29.7}"

log()  { printf '\033[36m[init-vps]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31m[err]\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Запускай от root (или sudo bash init-vps.sh)"
[[ -n "$DEPLOY_SSH_KEY" ]] || die "Задай DEPLOY_SSH_KEY=ssh-ed25519 AAAA... перед запуском"

### --- base system -------------------------------------------------------

log "Обновление пакетов"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

log "Установка базовых утилит"
apt-get install -y -qq \
  ca-certificates curl gnupg lsb-release \
  ufw fail2ban unattended-upgrades \
  git make htop tmux jq rsync \
  postgresql-client

log "Таймзона → ${TIMEZONE}"
timedatectl set-timezone "$TIMEZONE"

log "Unattended security updates"
dpkg-reconfigure -f noninteractive unattended-upgrades

### --- deploy user -------------------------------------------------------

if id "$DEPLOY_USER" &>/dev/null; then
  log "Юзер ${DEPLOY_USER} уже есть"
else
  log "Создание юзера ${DEPLOY_USER}"
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD:/usr/bin/docker, /usr/bin/docker-compose, /usr/local/bin/docker-compose, /usr/bin/systemctl" \
    > "/etc/sudoers.d/${DEPLOY_USER}"
  chmod 440 "/etc/sudoers.d/${DEPLOY_USER}"
fi

SSH_DIR="/home/${DEPLOY_USER}/.ssh"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SSH_DIR"
AUTH_KEYS="${SSH_DIR}/authorized_keys"
touch "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"
chown "$DEPLOY_USER":"$DEPLOY_USER" "$AUTH_KEYS"
if ! grep -qxF "$DEPLOY_SSH_KEY" "$AUTH_KEYS"; then
  echo "$DEPLOY_SSH_KEY" >> "$AUTH_KEYS"
  log "SSH-ключ добавлен в authorized_keys"
fi

### --- sshd hardening ----------------------------------------------------

log "SSH: отключение password-auth и root-login"
SSHD_CONF=/etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' "$SSHD_CONF"
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONF"
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' "$SSHD_CONF"
sed -i 's/^#\?ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' "$SSHD_CONF"
sed -i "s/^#\?Port .*/Port ${SSH_PORT}/" "$SSHD_CONF"
systemctl reload ssh || systemctl reload sshd

### --- ufw ---------------------------------------------------------------

log "UFW: 22/80/443"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp" comment 'ssh'
ufw allow 80/tcp comment 'http'
ufw allow 443/tcp comment 'https'
ufw --force enable

### --- fail2ban ----------------------------------------------------------

log "fail2ban: jail для sshd"
cat >/etc/fail2ban/jail.d/sshd.local <<EOF
[sshd]
enabled  = true
port     = ${SSH_PORT}
filter   = sshd
logpath  = %(sshd_log)s
maxretry = 4
bantime  = 1h
findtime = 10m
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

### --- docker ------------------------------------------------------------

if ! command -v docker &>/dev/null; then
  log "Установка Docker Engine"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  log "Docker уже установлен ($(docker --version))"
fi

usermod -aG docker "$DEPLOY_USER"

if ! command -v docker-compose &>/dev/null; then
  log "Установка standalone docker-compose ${DOCKER_COMPOSE_VERSION}"
  curl -fsSL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

### --- swap (если нет) ---------------------------------------------------

if ! swapon --show | grep -q '^'; then
  log "Создание 2G swap"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl vm.swappiness=10 >/dev/null
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
fi

### --- deploy dirs -------------------------------------------------------

log "Создание /srv/razum"
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /srv/razum
install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /srv/razum/backups
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /srv/razum/letsencrypt
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /srv/razum/certbot-webroot

### --- summary -----------------------------------------------------------

log ""
log "Готово. Финальные шаги:"
log "  1. Проверь SSH новым юзером с другой машины:"
log "       ssh -p ${SSH_PORT} ${DEPLOY_USER}@$(hostname -I | awk '{print $1}')"
log "  2. Клонируй репозиторий:"
log "       sudo -u ${DEPLOY_USER} git clone <repo> /srv/razum/app"
log "  3. Положи .env.production (см. .env.production.example)"
log "  4. Запусти first-deploy через deploy/Makefile"
