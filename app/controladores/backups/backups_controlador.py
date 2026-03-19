import subprocess
import os
import time
from datetime import datetime
from flask import Blueprint, render_template, flash, redirect, url_for, abort, current_app, send_from_directory
from flask_login import login_required, current_user

# Creamos el Blueprint exclusivo para backups
backups_bp = Blueprint('backups', __name__)

def realizar_el_backup_final():
    print("\n--- INICIANDO PROCESO DE BACKUP (v18) ---")
    
    # 1. Configurar Rutas
    ruta_base = os.path.abspath(os.path.join(current_app.root_path, '..'))
    destino_dir = os.path.join(ruta_base, 'backups')
    
    if not os.path.exists(destino_dir):
        os.makedirs(destino_dir)

    nombre_archivo = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    destino_final = os.path.join(destino_dir, nombre_archivo)

    # 2. RUTA EXACTA PARA TU PC (v18)
    pg_dump_path = 'pg_dump' # Por defecto para Linux

    if os.name == 'nt': 
        # Añadimos la versión 18 a la lista de búsqueda
        posibles_rutas = [
            r'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe', # <--- TU RUTA
            r'C:\Program Files\PostgreSQL\17\bin\pg_dump.exe',
            r'C:\Program Files\PostgreSQL\16\bin\pg_dump.exe'
        ]
        for ruta in posibles_rutas:
            if os.path.exists(ruta):
                pg_dump_path = ruta
                print(f"DEBUG: ¡Éxito! Usando pg_dump versión 18: {pg_dump_path}")
                break

    # 3. Comando y Entorno
    env = os.environ.copy()
    env['PGPASSWORD'] = "1025527566" 

    command = [
        pg_dump_path, '-h', 'localhost', '-U', 'postgres', '-p', '5432',
        '-F', 'c', '-f', destino_final, 'gestion_colegios'
    ]

    # 4. Ejecución
    try:
        resultado = subprocess.run(command, env=env, capture_output=True, text=True)
        
        if resultado.returncode != 0:
            print(f"ERROR DE POSTGRES: {resultado.stderr}")
            raise Exception(f"Error de pg_dump: {resultado.stderr}")
        
        if os.path.exists(destino_final):
            print(f"¡LOGRADO! Archivo creado en: {destino_final}")
        else:
            print("ERROR: El proceso terminó pero el archivo no aparece.")
            
    except Exception as e:
        print(f"FALLO CRÍTICO: {str(e)}")
        raise e

    return nombre_archivo
    
def limpiar_backups_antiguos():
    """Elimina archivos con más de 30 días de antigüedad"""
    ruta_backups = os.path.abspath(os.path.join(current_app.root_path, '..', 'backups'))
    if not os.path.exists(ruta_backups): return
    
    ahora = time.time()
    limite_segundos = 30 * 86400 

    for f in os.listdir(ruta_backups):
        ruta_archivo = os.path.join(ruta_backups, f)
        if os.path.isfile(ruta_archivo):
            if ahora - os.path.getmtime(ruta_archivo) > limite_segundos:
                os.remove(ruta_archivo)

# --- RUTAS DEL BLUEPRINT ---

@backups_bp.route('/admin/lista-backups')
@login_required
def lista_backups():
    if current_user.rol != 'admin':
        abort(403)

    limpiar_backups_antiguos()

    ruta_backups = os.path.abspath(os.path.join(current_app.root_path, '..', 'backups'))
    if not os.path.exists(ruta_backups):
        os.makedirs(ruta_backups)

    respaldos = []
    for f in os.listdir(ruta_backups):
        if f.endswith((".sql", ".backup")):
            ruta_completa = os.path.join(ruta_backups, f)
            stats = os.stat(ruta_completa)
            respaldos.append({
                'nombre': f,
                'fecha': datetime.fromtimestamp(stats.st_mtime).strftime('%d/%m/%Y %H:%M'),
                'tamano': f"{round(stats.st_size / (1024 * 1024), 2)} MB"
            })

    respaldos.sort(key=lambda x: x['fecha'], reverse=True)
    return render_template('admin_backups/backups.html', respaldos=respaldos)

@backups_bp.route('/admin/ejecutar-backup-manual')
@login_required
def backup_manual():
    if current_user.rol != 'admin':
        abort(403)
    try:
        nombre = realizar_el_backup_final()
        flash(f"Respaldo manual creado: {nombre}", "success")
    except Exception as e:
        flash(f"Error en respaldo manual: {str(e)}", "danger")
    
    return redirect(url_for('backups.lista_backups'))

@backups_bp.route('/admin/descargar-backup/<filename>')
@login_required
def descargar_backup(filename):
    if current_user.rol != 'admin':
        abort(403)
    
    ruta_backups = os.path.abspath(os.path.join(current_app.root_path, '..', 'backups'))
    return send_from_directory(ruta_backups, filename, as_attachment=True)