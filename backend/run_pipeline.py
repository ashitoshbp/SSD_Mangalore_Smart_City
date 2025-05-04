import subprocess
import sys
import os
from threading import Thread

def run_flask_app():
    try:
        subprocess.run([sys.executable, "app.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Flask app failed: {e}", file=sys.stderr)

def run_rag_pipeline():
    try:
        subprocess.run([sys.executable, "src/run_pipeline.py", "--all"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"RAG pipeline failed: {e}", file=sys.stderr)

if __name__ == "__main__":
    # Verify virtual environment
    if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("WARNING: Virtual environment not activated. Please activate it first.", file=sys.stderr)
    
    flask_thread = Thread(target=run_flask_app)
    rag_thread = Thread(target=run_rag_pipeline)
    
    flask_thread.start()
    rag_thread.start()
    
    flask_thread.join()
    rag_thread.join()
