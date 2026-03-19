from flask import Blueprint, render_template, request, redirect, url_for, flash, abort, jsonify
from flask_login import login_required, current_user
from app import db
from app.modelos.models import Usuario, Colegio  
from sqlalchemy import or_

# ESTA LÍNEA ES LA QUE FALTA:
admin_bp = Blueprint('admin', __name__, url_prefix='/admin/enlaces')

@admin_bp.route('/panel_enlace', methods=['GET', 'POST'])
@login_required
def panel_enlace():
    if current_user.rol != 'admin':
        abort(403)

    if request.method == 'POST':
        usuario_id = request.form.get('usuario_id')
        colegios_seleccionados = request.form.getlist('colegios_ids') # Lista de IDs desde checkboxes
        
        if usuario_id and colegios_seleccionados:
            for col_id in colegios_seleccionados:
                colegio = Colegio.query.get(col_id)
                if colegio:
                    colegio.usuario_id = usuario_id
            db.session.commit()
            flash('Colegios asignados correctamente', 'success')
        return redirect(url_for('admin.panel_enlace'))

    # 1. Traemos los contadores
    contadores = Usuario.query.filter_by(rol='contador').all()
    
    # 2. Traemos SOLO los colegios que NO tienen usuario_id (están libres)
    colegios_libres = Colegio.query.filter_by(usuario_id=None).all()
    
    # 3. (Opcional) Traer colegios ya asignados para saber quién tiene qué
    colegios_asignados = Colegio.query.filter(Colegio.usuario_id != None).all()

    return render_template('relaciones/enlaces.html', 
                           contadores=contadores, 
                           libres=colegios_libres,
                           asignados=colegios_asignados)


@admin_bp.route('/liberar_colegio/<int:id>')
@login_required
def liberar_colegio(id):
    if current_user.rol != 'admin':
        abort(403)
        
    colegio = Colegio.query.get_or_404(id)
    colegio.usuario_id = None  # Esto "libera" el colegio para que vuelva a estar disponible
    db.session.commit()
    
    flash(f'El colegio {colegio.nombre} ha sido liberado correctamente.', 'warning')
    return redirect(url_for('admin.panel_enlace'))


@admin_bp.route('/asignados_json')
@login_required
def asignados_json():
    if current_user.rol != 'admin':
        return jsonify({"error": "No autorizado"}), 403

    page = request.args.get('page', 1, type=int)
    search = request.args.get('q', '').strip()
    per_page = 8  # Número de filas por página

    # Query base: Solo colegios que TIENEN un contador asignado
    query = Colegio.query.filter(Colegio.usuario_id.isnot(None))

    # Filtro de búsqueda (Nombre del colegio o NIT)
    if search:
        query = query.filter(or_(
            Colegio.nombre.ilike(f"%{search}%"),
            Colegio.nit.ilike(f"%{search}%")
        ))

    # Paginación
    pagination = query.order_by(Colegio.nombre.asc()).paginate(page=page, per_page=per_page)

    return jsonify({
        "colegios": [{
            "id": c.id,
            "nombre": c.nombre,
            "nit": c.nit,
            "contador_nombre": c.contador.username.capitalize() if c.contador else "Sin asignar"
        } for c in pagination.items],
        "total_paginas": pagination.pages,
        "pagina_actual": pagination.page
    })