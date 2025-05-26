import webbrowser
import os

def show_html_page():
    # Lesen Sie den HTML-Inhalt aus der Vorlagendatei
    with open("dashboard.html", "r", encoding="utf-8") as template_file:
        html_content = template_file.read()
    
    # Schreiben Sie den Inhalt in die dashboard.html Datei
    with open("dashboard.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    
    # Öffnen Sie die Datei im Webbrowser
