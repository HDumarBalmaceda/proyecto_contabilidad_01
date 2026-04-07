from app import create_app
from flask_apscheduler import APScheduler
from app.controladores.backups.backups_controlador import realizar_el_backup_final, limpiar_backups_antiguos
from flask_wtf.csrf import CSRFProtect
from datetime import timedelta
import os

# 1. Instanciamos las extensiones
scheduler = APScheduler()
csrf = CSRFProtect()

# 2. Crear la aplicación usando la factoría
app = create_app()

# Inicializamos CSRF
csrf.init_app(app)

# Configuraciones extra de desarrollo
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

# 3. Configuración y arranque del Scheduler
if not scheduler.running:
    scheduler.init_app(app)
    
    @scheduler.task('cron', id='backup_diario_automatico', hour=0, minute=0)
    def tarea_programada_backup():
        with app.app_context():
            try:
                print("Iniciando backup automático diario...")
                realizar_el_backup_final()
                limpiar_backups_antiguos()
                print("Backup y limpieza completados con éxito.")
            except Exception as e:
                print(f"Error en la tarea automática de backup: {e}")

    scheduler.start()

# 4. Ejecución del servidor
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=True)