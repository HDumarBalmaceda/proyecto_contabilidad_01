from app import create_app, db
from app.modelos.models import Usuario

app = create_app()

def crear_primer_admin():
    with app.app_context():
        # Verificamos si ya existe un admin para no duplicar
        admin_existente = Usuario.query.filter_by(username='admin').first()
        
        if not admin_existente:
            print("Creando usuario administrador...")
            # Aquí defines tu usuario y tu clave
            nuevo_admin = Usuario(username='admin@hamet', rol='admin')
            nuevo_admin.set_password('admin') # <--- Cambia esta clave por una segura
            
            db.session.add(nuevo_admin)
            db.session.commit()
            print("¡Usuario administrador creado exitosamente!")
        else:
            print("El usuario administrador ya existe.")

if __name__ == '__main__':
    crear_primer_admin()