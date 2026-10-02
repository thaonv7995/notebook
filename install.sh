#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Notebook Studio — Installer / Updater / Uninstaller
#
# Usage:
#   # Install (fresh)
#   curl -fsSL "https://github.com/thaonv7995/notebook/releases/latest/download/install.sh" | bash -s -- "thaonv7995/notebook"
#
#   # Update to latest version (preserves data & credentials)
#   curl -fsSL "https://github.com/thaonv7995/notebook/releases/latest/download/install.sh" | bash -s -- "thaonv7995/notebook" update
#
#   # Uninstall (removes app, keeps data backup)
#   curl -fsSL "https://github.com/thaonv7995/notebook/releases/latest/download/install.sh" | bash -s -- "thaonv7995/notebook" uninstall
#
# Environment variables:
#   INSTALL_DIR  — Installation directory (default: ~/notebook-studio)
#   PORT         — Server port (default: 27972)
# ──────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configuration ───
REPO="${1:-}"
ACTION="${2:-install}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/notebook-studio}"
PORT="${PORT:-27972}"
ADMIN_EMAIL="admin@notebook.com"
SERVICE_NAME="notebook-studio"

# ─── Colors ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()  { echo -e "${BLUE}ℹ${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1" >&2; }

# ─── Preflight ───
preflight() {
  if [ -z "$REPO" ]; then
    err "Missing repository argument."
    echo ""
    echo -e "  ${BOLD}Usage:${NC}"
    echo -e "    ${DIM}# Install${NC}"
    echo -e "    curl -fsSL \"https://github.com/${CYAN}OWNER/REPO${NC}/releases/latest/download/install.sh\" | bash -s -- \"${CYAN}OWNER/REPO${NC}\""
    echo ""
    echo -e "    ${DIM}# Update${NC}"
    echo -e "    curl -fsSL \"...\" | bash -s -- \"OWNER/REPO\" ${CYAN}update${NC}"
    echo ""
    echo -e "    ${DIM}# Uninstall${NC}"
    echo -e "    curl -fsSL \"...\" | bash -s -- \"OWNER/REPO\" ${CYAN}uninstall${NC}"
    echo ""
    exit 1
  fi

  for cmd in curl tar node npm; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      err "Required command '${BOLD}$cmd${NC}' not found. Please install it first."
      exit 1
    fi
  done

  NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -lt 18 ]; then
    err "Node.js v18+ is required (found $(node -v))."
    exit 1
  fi
}

# ─── Detect systemd ───
has_systemd() {
  command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]
}

# ─── Get node path for systemd ───
get_node_path() {
  command -v node
}

# ─── Get latest release info ───
fetch_release() {
  info "Fetching latest release from ${BOLD}${REPO}${NC}..."
  RELEASE_URL="https://api.github.com/repos/${REPO}/releases/latest"
  RELEASE_JSON=$(curl -fsSL "$RELEASE_URL" 2>/dev/null || true)

  if [ -z "$RELEASE_JSON" ]; then
    err "Could not fetch release info from GitHub."
    exit 1
  fi

  TAG=$(echo "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name"[[:space:]]*:[[:space:]]*"//' | sed 's/".*//')
  TARBALL_URL="https://github.com/${REPO}/releases/download/${TAG}/notebook-studio-${TAG}.tar.gz"

  if [ -z "$TAG" ]; then
    err "Could not determine the latest release tag."
    exit 1
  fi
  ok "Latest release: ${BOLD}${TAG}${NC}"
}

# ─── Download & extract release ───
download_and_extract() {
  local target_dir="$1"

  info "Downloading ${BOLD}notebook-studio-${TAG}.tar.gz${NC}..."
  TMPDIR="$(mktemp -d)"
  TARBALL="$TMPDIR/notebook-studio.tar.gz"

  curl -fSL "$TARBALL_URL" -o "$TARBALL" || {
    err "Failed to download release tarball."
    rm -rf "$TMPDIR"
    exit 1
  }
  ok "Downloaded successfully."

  info "Extracting to ${BOLD}${target_dir}${NC}..."
  mkdir -p "$target_dir"
  tar -xzf "$TARBALL" -C "$target_dir" --strip-components=1
  rm -rf "$TMPDIR"
  ok "Files extracted."
}

# ═══════════════════════════════════════════════════════════════
#  SERVICE MANAGEMENT (systemd with fallback to nohup)
# ═══════════════════════════════════════════════════════════════

# ─── Create systemd service ───
setup_systemd_service() {
  local node_bin
  node_bin="$(get_node_path)"
  local service_file="/etc/systemd/system/${SERVICE_NAME}.service"
  local run_user
  run_user="$(whoami)"

  info "Creating systemd service: ${BOLD}${SERVICE_NAME}${NC}..."

  # Create log directory and files with proper permissions
  mkdir -p "$INSTALL_DIR/logs"
  touch "$INSTALL_DIR/logs/stdout.log" "$INSTALL_DIR/logs/stderr.log" 2>/dev/null || true
  if [ "$(id -u)" -eq 0 ] && [ "$run_user" != "root" ]; then
    chown -R "${run_user}:${run_user}" "$INSTALL_DIR/logs" 2>/dev/null || true
  elif command -v sudo >/dev/null 2>&1 && [ "$run_user" != "root" ]; then
    sudo chown -R "${run_user}:${run_user}" "$INSTALL_DIR/logs" 2>/dev/null || true
  fi

  local service_content="[Unit]
Description=Notebook Studio — Digital Notebook Server
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=${run_user}
WorkingDirectory=${INSTALL_DIR}
ExecStart=${node_bin} server/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=${INSTALL_DIR}/.env

# Logging
StandardOutput=append:${INSTALL_DIR}/logs/stdout.log
StandardError=append:${INSTALL_DIR}/logs/stderr.log

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
PrivateTmp=true
ReadWritePaths=${INSTALL_DIR} /tmp /var/tmp

[Install]
WantedBy=multi-user.target"

  # Need sudo for systemd
  if [ "$(id -u)" -eq 0 ]; then
    echo "$service_content" > "$service_file"
    systemctl daemon-reload
    systemctl enable "${SERVICE_NAME}" >/dev/null 2>&1
  else
    echo "$service_content" | sudo tee "$service_file" >/dev/null
    sudo systemctl daemon-reload
    sudo systemctl enable "${SERVICE_NAME}" >/dev/null 2>&1
  fi

  ok "Systemd service created and enabled."

  # Create logrotate config
  setup_logrotate
}

# ─── Log rotation ───
setup_logrotate() {
  local logrotate_conf="/etc/logrotate.d/${SERVICE_NAME}"
  local rotate_content="${INSTALL_DIR}/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    size 10M
}"

  if [ "$(id -u)" -eq 0 ]; then
    echo "$rotate_content" > "$logrotate_conf"
  elif command -v sudo >/dev/null 2>&1; then
    echo "$rotate_content" | sudo tee "$logrotate_conf" >/dev/null
  fi
  ok "Log rotation configured (7 days, max 10MB per file)."
}

# ─── Start service ───
start_service() {
  if has_systemd; then
    info "Starting ${BOLD}${SERVICE_NAME}${NC} service..."
    if [ "$(id -u)" -eq 0 ]; then
      systemctl start "${SERVICE_NAME}"
    else
      sudo systemctl start "${SERVICE_NAME}"
    fi
    sleep 2

    if systemctl is-active --quiet "${SERVICE_NAME}"; then
      ok "Service is running ✓"
      echo ""
      echo -e "  ${DIM}Useful commands:${NC}"
      echo -e "    Status:   ${BOLD}sudo systemctl status ${SERVICE_NAME}${NC}"
      echo -e "    Logs:     ${BOLD}sudo journalctl -u ${SERVICE_NAME} -f${NC}"
      echo -e "    Restart:  ${BOLD}sudo systemctl restart ${SERVICE_NAME}${NC}"
      echo -e "    Stop:     ${BOLD}sudo systemctl stop ${SERVICE_NAME}${NC}"
      return 0
    else
      err "Service failed to start."
      echo -e "  ${DIM}Check logs: sudo journalctl -u ${SERVICE_NAME} -n 30${NC}"
      return 1
    fi
  else
    # Fallback: nohup
    start_server_nohup
  fi
}

# ─── Stop service ───
stop_service() {
  if has_systemd && systemctl list-unit-files "${SERVICE_NAME}.service" >/dev/null 2>&1; then
    info "Stopping ${BOLD}${SERVICE_NAME}${NC} service..."
    if [ "$(id -u)" -eq 0 ]; then
      systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
    else
      sudo systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
    fi
    ok "Service stopped."
  else
    # Fallback: PID file / port kill
    stop_server_nohup
  fi
}

# ─── Remove systemd service ───
remove_systemd_service() {
  if has_systemd; then
    local service_file="/etc/systemd/system/${SERVICE_NAME}.service"
    if [ -f "$service_file" ]; then
      info "Removing systemd service..."
      if [ "$(id -u)" -eq 0 ]; then
        systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
        systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
        rm -f "$service_file"
        systemctl daemon-reload
      else
        sudo systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
        sudo systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
        sudo rm -f "$service_file"
        sudo systemctl daemon-reload
      fi
      ok "Systemd service removed."
    fi

    # Remove logrotate config
    local logrotate_conf="/etc/logrotate.d/${SERVICE_NAME}"
    if [ -f "$logrotate_conf" ]; then
      if [ "$(id -u)" -eq 0 ]; then
        rm -f "$logrotate_conf"
      else
        sudo rm -f "$logrotate_conf"
      fi
    fi
  fi
}

# ─── Fallback: nohup start ───
start_server_nohup() {
  info "Starting Notebook Studio (nohup fallback)..."
  mkdir -p "$INSTALL_DIR/logs"
  cd "$INSTALL_DIR"
  NODE_ENV=production nohup node server/index.js \
    >> "$INSTALL_DIR/logs/stdout.log" \
    2>> "$INSTALL_DIR/logs/stderr.log" &
  local server_pid=$!
  echo "$server_pid" > "$INSTALL_DIR/.server.pid"

  sleep 2
  if kill -0 "$server_pid" 2>/dev/null; then
    ok "Server is running (PID: ${server_pid})."
    echo ""
    echo -e "  ${DIM}Note: No systemd detected. Using nohup (no auto-restart on crash/reboot).${NC}"
    echo -e "  ${DIM}Logs: tail -f ${INSTALL_DIR}/logs/stdout.log${NC}"
    return 0
  else
    err "Server failed to start. Check ${INSTALL_DIR}/logs/stderr.log"
    return 1
  fi
}

# ─── Fallback: nohup stop ───
stop_server_nohup() {
  local pid_file="$INSTALL_DIR/.server.pid"
  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      info "Stopping server (PID: $pid)..."
      kill "$pid" 2>/dev/null || true
      sleep 1
      ok "Server stopped."
    fi
    rm -f "$pid_file"
  fi

  # Also try to kill by port
  if command -v lsof >/dev/null 2>&1; then
    local port_pid
    port_pid=$(lsof -ti :"$PORT" 2>/dev/null || true)
    if [ -n "$port_pid" ]; then
      info "Stopping process on port ${PORT}..."
      kill "$port_pid" 2>/dev/null || true
      sleep 1
    fi
  fi
}

# ─── Get current installed version ───
get_installed_version() {
  if [ -f "$INSTALL_DIR/.version" ]; then
    cat "$INSTALL_DIR/.version"
  else
    echo "unknown"
  fi
}

# ══════════════════════════════════════════════════════════════
#  INSTALL (fresh)
# ══════════════════════════════════════════════════════════════
do_install() {
  echo ""
  echo -e "${CYAN}${BOLD}  ┌───────────────────────────────────────┐${NC}"
  echo -e "${CYAN}${BOLD}  │       📓 Notebook Studio Installer     │${NC}"
  echo -e "${CYAN}${BOLD}  └───────────────────────────────────────┘${NC}"
  echo ""

  if [ -d "$INSTALL_DIR/server" ]; then
    warn "Existing installation detected at ${BOLD}${INSTALL_DIR}${NC}"
    warn "Use '${BOLD}update${NC}' to upgrade or '${BOLD}uninstall${NC}' first."
    echo ""
    exit 1
  fi

  fetch_release
  download_and_extract "$INSTALL_DIR"

  # Install dependencies
  info "Installing Node.js dependencies..."
  cd "$INSTALL_DIR"
  npm install --omit=dev --ignore-scripts 2>/dev/null
  ok "Dependencies installed."

  # Generate credentials
  ADMIN_PASS=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%' </dev/urandom | head -c 16 || true)
  JWT_SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48 || true)

  cat > "$INSTALL_DIR/.env" <<EOF
# Notebook Studio — Generated by install.sh
# $(date -u +"%Y-%m-%dT%H:%M:%SZ")

PORT=${PORT}
JWT_SECRET=${JWT_SECRET}
ADMIN_USERNAME=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASS}
NODE_ENV=production
EOF
  chmod 600 "$INSTALL_DIR/.env"
  ok "Credentials generated."

  # Create logs directory
  mkdir -p "$INSTALL_DIR/logs"

  # Save version marker
  echo "$TAG" > "$INSTALL_DIR/.version"

  # Setup service
  if has_systemd; then
    setup_systemd_service
    start_service
  else
    start_server_nohup
  fi

  echo ""
  echo -e "${GREEN}${BOLD}  ┌───────────────────────────────────────────────────┐${NC}"
  echo -e "${GREEN}${BOLD}  │  ✅ Notebook Studio installed successfully!       │${NC}"
  echo -e "${GREEN}${BOLD}  └───────────────────────────────────────────────────┘${NC}"
  echo ""
  echo -e "  ${BOLD}URL:${NC}       http://localhost:${PORT}"
  echo -e "  ${BOLD}Username:${NC}  ${CYAN}${ADMIN_EMAIL}${NC}"
  echo -e "  ${BOLD}Password:${NC}  ${CYAN}${ADMIN_PASS}${NC}"
  echo -e "  ${BOLD}Install:${NC}   ${INSTALL_DIR}"
  echo -e "  ${BOLD}Version:${NC}   ${TAG}"
  echo -e "  ${BOLD}Logs:${NC}      ${INSTALL_DIR}/logs/"
  if has_systemd; then
    echo -e "  ${BOLD}Service:${NC}   ${SERVICE_NAME} (systemd)"
    echo -e "             auto-restart ✓  boot-start ✓  log-rotate ✓"
  fi
  echo ""
  echo -e "  ${YELLOW}⚠ Save the password above — it will not be shown again.${NC}"
  echo ""
}

# ══════════════════════════════════════════════════════════════
#  UPDATE (preserve data & credentials)
# ══════════════════════════════════════════════════════════════
do_update() {
  echo ""
  echo -e "${CYAN}${BOLD}  ┌───────────────────────────────────────┐${NC}"
  echo -e "${CYAN}${BOLD}  │       📓 Notebook Studio Updater       │${NC}"
  echo -e "${CYAN}${BOLD}  └───────────────────────────────────────┘${NC}"
  echo ""

  if [ ! -d "$INSTALL_DIR/server" ]; then
    warn "No installation found at ${BOLD}${INSTALL_DIR}${NC}"
    info "Running fresh install instead..."
    do_install
    return
  fi

  local current_version
  current_version=$(get_installed_version)
  info "Current version: ${BOLD}${current_version}${NC}"

  fetch_release

  if [ "$current_version" = "$TAG" ]; then
    ok "Already running the latest version (${TAG}). Nothing to do."
    echo ""
    exit 0
  fi

  info "Updating ${BOLD}${current_version}${NC} → ${BOLD}${TAG}${NC}..."

  # Stop service
  stop_service

  # Backup data & config
  info "Backing up data and credentials..."
  TMPBACKUP=$(mktemp -d)
  [ -f "$INSTALL_DIR/.env" ]     && cp "$INSTALL_DIR/.env" "$TMPBACKUP/"
  [ -d "$INSTALL_DIR/data" ]     && cp -r "$INSTALL_DIR/data" "$TMPBACKUP/"
  [ -f "$INSTALL_DIR/.version" ] && cp "$INSTALL_DIR/.version" "$TMPBACKUP/"
  ok "Backup created."

  # Remove old app files (keep node_modules, data, logs for speed & stability)
  info "Removing old application files..."
  rm -rf "$INSTALL_DIR/server" "$INSTALL_DIR/dist" "$INSTALL_DIR/public"
  rm -f "$INSTALL_DIR/package.json" "$INSTALL_DIR/package-lock.json"
  rm -f "$INSTALL_DIR/sw.js" "$INSTALL_DIR/manifest.webmanifest"
  rm -f "$INSTALL_DIR/install.sh" "$INSTALL_DIR/README.md" "$INSTALL_DIR/FEATURES.md"

  # Download & extract new version
  download_and_extract "$INSTALL_DIR"

  # Restore data and config if needed
  info "Verifying data and credentials..."
  [ -f "$TMPBACKUP/.env" ] && [ ! -f "$INSTALL_DIR/.env" ] && cp "$TMPBACKUP/.env" "$INSTALL_DIR/.env"
  [ -d "$TMPBACKUP/data" ] && [ ! -d "$INSTALL_DIR/data" ] && cp -r "$TMPBACKUP/data" "$INSTALL_DIR/"
  
  # Ensure proper log ownership if sudo is available
  if command -v sudo >/dev/null 2>&1 && [ -d "$INSTALL_DIR/logs" ]; then
    sudo chown -R "$(whoami):$(whoami)" "$INSTALL_DIR/logs" 2>/dev/null || true
  fi
  rm -rf "$TMPBACKUP"
  ok "Data restored."

  # Update dependencies
  info "Updating Node.js dependencies..."
  cd "$INSTALL_DIR"
  npm install --omit=dev --ignore-scripts 2>/dev/null
  ok "Dependencies updated."

  # Save new version
  echo "$TAG" > "$INSTALL_DIR/.version"

  # Re-setup and restart service (in case node path changed)
  if has_systemd; then
    setup_systemd_service
  fi
  start_service

  echo ""
  echo -e "${GREEN}${BOLD}  ┌───────────────────────────────────────────────────┐${NC}"
  echo -e "${GREEN}${BOLD}  │  ✅ Notebook Studio updated successfully!         │${NC}"
  echo -e "${GREEN}${BOLD}  └───────────────────────────────────────────────────┘${NC}"
  echo ""
  echo -e "  ${BOLD}Version:${NC}   ${current_version} → ${CYAN}${TAG}${NC}"
  echo -e "  ${BOLD}URL:${NC}       http://localhost:${PORT}"
  echo -e "  ${BOLD}Data:${NC}      Preserved ✓"
  echo -e "  ${BOLD}Creds:${NC}     Preserved ✓"
  echo -e "  ${BOLD}Logs:${NC}      Preserved ✓"
  echo ""
}

# ══════════════════════════════════════════════════════════════
#  UNINSTALL
# ══════════════════════════════════════════════════════════════
do_uninstall() {
  echo ""
  echo -e "${RED}${BOLD}  ┌───────────────────────────────────────┐${NC}"
  echo -e "${RED}${BOLD}  │       📓 Notebook Studio Uninstaller   │${NC}"
  echo -e "${RED}${BOLD}  └───────────────────────────────────────┘${NC}"
  echo ""

  if [ ! -d "$INSTALL_DIR" ]; then
    warn "No installation found at ${BOLD}${INSTALL_DIR}${NC}. Nothing to uninstall."
    exit 0
  fi

  local current_version
  current_version=$(get_installed_version)
  info "Found installation: ${BOLD}${current_version}${NC} at ${INSTALL_DIR}"

  # Confirm
  echo ""
  echo -e "  ${YELLOW}This will:${NC}"
  echo -e "    • Stop the running server / service"
  echo -e "    • Remove systemd service (if exists)"
  echo -e "    • Remove all application files"
  echo -e "    • Back up your data to ${BOLD}~/notebook-studio-backup-$(date +%Y%m%d)${NC}"
  echo ""
  echo -en "  ${BOLD}Type 'yes' to confirm: ${NC}"

  # When running via pipe (curl | bash), stdin is the pipe, not the terminal.
  # Read from /dev/tty to get actual user input.
  if [ -t 0 ]; then
    read -r confirm
  elif [ -e /dev/tty ]; then
    read -r confirm < /dev/tty
  else
    confirm="${CONFIRM:-}"
    echo "$confirm"
  fi

  if [ "$confirm" != "yes" ]; then
    warn "Uninstall cancelled."
    if [ ! -t 0 ] && [ -z "${CONFIRM:-}" ]; then
      echo ""
      echo -e "  ${DIM}Tip: Use CONFIRM=yes to auto-confirm when piped:${NC}"
      echo -e "  ${DIM}curl ... | CONFIRM=yes bash -s -- \"${REPO}\" uninstall${NC}"
    fi
    exit 0
  fi

  # Stop & remove service
  stop_service
  remove_systemd_service

  # Backup data
  BACKUP_DIR="$HOME/notebook-studio-backup-$(date +%Y%m%d-%H%M%S)"
  if [ -d "$INSTALL_DIR/data" ] || [ -f "$INSTALL_DIR/.env" ]; then
    info "Backing up data to ${BOLD}${BACKUP_DIR}${NC}..."
    mkdir -p "$BACKUP_DIR"
    [ -d "$INSTALL_DIR/data" ] && cp -r "$INSTALL_DIR/data" "$BACKUP_DIR/"
    [ -f "$INSTALL_DIR/.env" ] && cp "$INSTALL_DIR/.env" "$BACKUP_DIR/"
    [ -d "$INSTALL_DIR/logs" ] && cp -r "$INSTALL_DIR/logs" "$BACKUP_DIR/" 2>/dev/null || true
    ok "Data backed up."
  fi

  # Remove installation
  info "Removing ${BOLD}${INSTALL_DIR}${NC}..."
  rm -rf "$INSTALL_DIR" 2>/dev/null || (command -v sudo >/dev/null 2>&1 && sudo rm -rf "$INSTALL_DIR") 2>/dev/null || true
  ok "Installation removed."

  echo ""
  echo -e "${GREEN}${BOLD}  ┌───────────────────────────────────────────────────┐${NC}"
  echo -e "${GREEN}${BOLD}  │  ✅ Notebook Studio uninstalled.                  │${NC}"
  echo -e "${GREEN}${BOLD}  └───────────────────────────────────────────────────┘${NC}"
  echo ""
  if [ -d "$BACKUP_DIR" ]; then
    echo -e "  ${BOLD}Data backup:${NC} ${BACKUP_DIR}"
    echo -e "  ${DIM}To delete backup: rm -rf ${BACKUP_DIR}${NC}"
  fi
  echo ""
}

# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════
preflight

case "$ACTION" in
  install)    do_install   ;;
  update)     do_update    ;;
  uninstall)  do_uninstall ;;
  *)
    err "Unknown action: ${BOLD}${ACTION}${NC}"
    echo ""
    echo -e "  Available actions: ${CYAN}install${NC} | ${CYAN}update${NC} | ${CYAN}uninstall${NC}"
    echo ""
    exit 1
    ;;
esac
