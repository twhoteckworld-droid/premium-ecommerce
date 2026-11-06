#!/data/data/com.termux/files/usr/bin/bash
# NovaStore Server Manager

cd ~/premium-ecommerce

case "$1" in
  start)
    pkill -f "node backend/server.js" 2>/dev/null
    sleep 1
    echo "🚀 Starting NovaStore server..."
    node backend/server.js
    ;;
  stop)
    pkill -f "node backend/server.js" 2>/dev/null
    echo "⛔ Server stopped"
    ;;
  restart)
    pkill -f "node backend/server.js" 2>/dev/null
    sleep 1
    echo "🔄 Restarting..."
    node backend/server.js
    ;;
  status)
    if pgrep -f "node backend/server.js" > /dev/null; then
      echo "✅ Server running (PID: $(pgrep -f 'node backend/server.js'))"
      curl -s -o /dev/null -w "   API status: %{http_code}\n" http://127.0.0.1:5000/api/products
    else
      echo "❌ Server NOT running"
    fi
    ;;
  *)
    echo "Usage: ./start.sh {start|stop|restart|status}"
    ;;
esac
