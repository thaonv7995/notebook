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
    echo -e "    curl -fsSL \"https://github.com/${CYAN}OWNER/REPO${NC}/releases/latest/download/install.sh\" | sh -s -- \"${CYAN}OWNER/REPO${NC}\""
    echo ""
    echo -e "    ${DIM}# Update${NC}"
    echo -e "    curl -fsSL \"...\" | sh -s -- \"OWNER/REPO\" ${CYAN}update${NC}"
    echo ""
    echo -e "    ${DIM}# Uninstall${NC}"
    echo -e "    curl -fsSL \"...\" | sh -s -- \"OWNER/REPO\" ${CYAN}uninstall${NC}"
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

# ─── Stop running server ───
stop_server() {
  local pid_file="$INSTALL_DIR/.server.pid"
  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      info "Stopping running server (PID: $pid)..."
      kill "$pid" 2>/dev/null || true
      sleep 1
      ok "Server stopped."
    fi
    rm -f "$pid_file"
  fi

  # Also try to kill by port
  local port_pid
  port_pid=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$port_pid" ]; then
    info "Stopping process on port ${PORT}..."
    kill "$port_pid" 2>/dev/null || true
    sleep 1
  fi
}

# ─── Start server ───
start_server() {
  info "Starting Notebook Studio on port ${PORT}..."
  cd "$INSTALL_DIR"
  NODE_ENV=production nohup node server/index.js > "$INSTALL_DIR/server.log" 2>&1 &
  local server_pid=$!
  echo "$server_pid" > "$INSTALL_DIR/.server.pid"

  sleep 2
  if kill -0 "$server_pid" 2>/dev/null; then
    ok "Server is running (PID: ${server_pid})."
    return 0
  else
    err "Server failed to start. Check ${INSTALL_DIR}/server.log"
    return 1
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
    echo -e "  ${DIM}curl -fsSL \"...\" | sh -s -- \"${REPO}\" update${NC}"
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

  # Save version marker
  echo "$TAG" > "$INSTALL_DIR/.version"

  # Start server
  start_server

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
  echo ""
  echo -e "  ${YELLOW}⚠ Save the password above — it will not be shown again.${NC}"
  echo ""
  echo -e "  ${DIM}Commands:${NC}"
  echo -e "    Stop:      ${BOLD}kill \$(cat ${INSTALL_DIR}/.server.pid)${NC}"
  echo -e "    Start:     ${BOLD}cd ${INSTALL_DIR} && NODE_ENV=production node server/index.js${NC}"
  echo -e "    Update:    ${BOLD}curl -fsSL \"...\" | sh -s -- \"${REPO}\" update${NC}"
  echo -e "    Uninstall: ${BOLD}curl -fsSL \"...\" | sh -s -- \"${REPO}\" uninstall${NC}"
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

  # Stop server
  stop_server

  # Backup data & config
  info "Backing up data and credentials..."
  TMPBACKUP=$(mktemp -d)
  [ -f "$INSTALL_DIR/.env" ]     && cp "$INSTALL_DIR/.env" "$TMPBACKUP/"
  [ -d "$INSTALL_DIR/data" ]     && cp -r "$INSTALL_DIR/data" "$TMPBACKUP/"
  [ -f "$INSTALL_DIR/.version" ] && cp "$INSTALL_DIR/.version" "$TMPBACKUP/"
  ok "Backup created."

  # Remove old app files (keep node_modules for speed)
  info "Removing old application files..."
  rm -rf "$INSTALL_DIR/server" "$INSTALL_DIR/dist" "$INSTALL_DIR/public"
  rm -f "$INSTALL_DIR/package.json" "$INSTALL_DIR/package-lock.json"
  rm -f "$INSTALL_DIR/sw.js" "$INSTALL_DIR/manifest.webmanifest"
  rm -f "$INSTALL_DIR/install.sh" "$INSTALL_DIR/README.md" "$INSTALL_DIR/FEATURES.md"

  # Download & extract new version
  download_and_extract "$INSTALL_DIR"

  # Restore data & config
  info "Restoring data and credentials..."
  [ -f "$TMPBACKUP/.env" ] && cp "$TMPBACKUP/.env" "$INSTALL_DIR/.env"
  [ -d "$TMPBACKUP/data" ] && cp -r "$TMPBACKUP/data" "$INSTALL_DIR/"
  rm -rf "$TMPBACKUP"
  ok "Data restored."

  # Update dependencies
  info "Updating Node.js dependencies..."
  cd "$INSTALL_DIR"
  npm install --omit=dev --ignore-scripts 2>/dev/null
  ok "Dependencies updated."

  # Save new version
  echo "$TAG" > "$INSTALL_DIR/.version"

  # Restart server
  start_server

  echo ""
  echo -e "${GREEN}${BOLD}  ┌───────────────────────────────────────────────────┐${NC}"
  echo -e "${GREEN}${BOLD}  │  ✅ Notebook Studio updated successfully!         │${NC}"
  echo -e "${GREEN}${BOLD}  └───────────────────────────────────────────────────┘${NC}"
  echo ""
  echo -e "  ${BOLD}Version:${NC}   ${current_version} → ${CYAN}${TAG}${NC}"
  echo -e "  ${BOLD}URL:${NC}       http://localhost:${PORT}"
  echo -e "  ${BOLD}Data:${NC}      Preserved ✓"
  echo -e "  ${BOLD}Creds:${NC}     Preserved ✓"
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
  echo -e "    • Stop the running server"
  echo -e "    • Remove all application files"
  echo -e "    • Back up your data to ${BOLD}~/notebook-studio-backup-$(date +%Y%m%d)${NC}"
  echo ""
  echo -en "  ${BOLD}Type 'yes' to confirm: ${NC}"

  # If running non-interactively (piped), check for CONFIRM env var
  if [ -t 0 ]; then
    read -r confirm
  else
    confirm="${CONFIRM:-}"
    echo "$confirm"
  fi

  if [ "$confirm" != "yes" ]; then
    warn "Uninstall cancelled."
    exit 0
  fi

  # Stop server
  stop_server

  # Backup data
  BACKUP_DIR="$HOME/notebook-studio-backup-$(date +%Y%m%d-%H%M%S)"
  if [ -d "$INSTALL_DIR/data" ] || [ -f "$INSTALL_DIR/.env" ]; then
    info "Backing up data to ${BOLD}${BACKUP_DIR}${NC}..."
    mkdir -p "$BACKUP_DIR"
    [ -d "$INSTALL_DIR/data" ] && cp -r "$INSTALL_DIR/data" "$BACKUP_DIR/"
    [ -f "$INSTALL_DIR/.env" ] && cp "$INSTALL_DIR/.env" "$BACKUP_DIR/"
    ok "Data backed up."
  fi

  # Remove installation
  info "Removing ${BOLD}${INSTALL_DIR}${NC}..."
  rm -rf "$INSTALL_DIR"
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
