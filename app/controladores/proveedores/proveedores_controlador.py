from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from app import db
from app.modelos.models import Proveedor 
from app.modelos.models import Colegio
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_
from flask_login import login_required, current_user

proveedores_bp = Blueprint('proveedores', __name__, url_prefix='/proveedores')


@proveedores_bp.route('/', methods=['GET', 'POST'])
@login_required
def listar_proveedores():
    colegio_id = session.get('colegio_id')
    
    # --- 1. LÓGICA DE PROCESAMIENTO (POST) ---
    if request.method == 'POST':
        documento = request.form.get('documento')
        creado_nuevo = False
        
        try:
            proveedor = Proveedor.query.filter_by(documento=documento).first()

            if not proveedor:
                proveedor = Proveedor(
                    usuario_id=current_user.id,
                    tipo_tercero=request.form.get('tipo_tercero'),
                    documento=documento,
                    dv=request.form.get('dv'),
                    razon_social=request.form.get('razon_social'),
                    primer_nombre=request.form.get('primer_nombre'),
                    segundo_nombre=request.form.get('segundo_nombre'),
                    primer_apellido=request.form.get('primer_apellido'),
                    segundo_apellido=request.form.get('segundo_apellido'),
                    direccion=request.form.get('direccion'),
                    departamento=request.form.get('departamento'),
                    ciudad=request.form.get('ciudad'),
                    correo_electronico=request.form.get('correo_electronico'),
                    movil=request.form.get('movil'),
                    renta=request.form.get('renta'),
                    banco=request.form.get('banco'),
                    no_cuenta=request.form.get('no_cuenta')
                )
                db.session.add(proveedor)
                db.session.flush() 
                mensaje_final = 'Proveedor registrado exitosamente.'
                creado_nuevo = True
            else:
                mensaje_final = f'El proveedor con documento {documento} ya esta registrado.'

            if colegio_id:
                colegio = Colegio.query.get(colegio_id)
                if colegio and proveedor not in colegio.proveedores:
                    colegio.proveedores.append(proveedor)
            
            db.session.commit()

            if request.headers.get('X-CSRFToken') or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({
                    "status": "success" if creado_nuevo else "error",
                    "message": mensaje_final
                })

            flash(mensaje_final, 'success' if creado_nuevo else 'warning')
            return redirect(url_for('proveedores.listar_proveedores'))

        except Exception as e:
            db.session.rollback()
            if request.headers.get('X-CSRFToken') or request.headers.get('With') == 'XMLHttpRequest':
                return jsonify({"status": "error", "message": f"Error: {str(e)}"}), 500
            flash(f'Error: {str(e)}', 'danger')
            return redirect(url_for('proveedores.listar_proveedores'))

    # --- 2. LÓGICA DE FILTRADO Y PREPARACIÓN DE DATOS (GET) ---
    if current_user.rol == 'admin':
        proveedores = Proveedor.query.all()
        template = 'admin_proveedor/admin_proveedor.html'
    else:
        if colegio_id:
            colegio = Colegio.query.get(colegio_id)
            proveedores = colegio.proveedores if colegio else []
        else:
            proveedores = Proveedor.query.filter_by(usuario_id=current_user.id).all()
        template = 'proveedores/proveedores.html'

    # --- 3. APLICAR PRIORIDAD DE NOMBRE (Lo que limpia los "0") ---
    for p in proveedores:
        p_nom = (p.primer_nombre or "").strip()
        p_ape = (p.primer_apellido or "").strip()
        r_soc = (p.razon_social or "").strip()

        # Si tiene nombre (Persona Natural), esa es la prioridad
        if p_nom and p_nom.lower() != 'none':
            p.nombre_para_mostrar = f"{p_nom} {p_ape}".strip()
        # Si no tiene nombre pero tiene Razón Social (y no es un "0")
        elif r_soc and r_soc.lower() != 'none' and r_soc != '0':
            p.nombre_para_mostrar = r_soc
        # Caso de emergencia: mostrar el documento
        else:
            p.nombre_para_mostrar = f"NIT/CC: {p.documento}"

    return render_template(template, proveedores=proveedores)

@proveedores_bp.route('/editar/<int:id>', methods=['POST'])
@login_required
def editar_proveedor(id):
    # 1. BLINDAJE TOTAL: Si no es admin, fuera.
    if current_user.rol != 'admin':
        flash('Acceso denegado: Solo el administrador puede modificar la información maestra de los proveedores.', 'danger')
        return redirect(url_for('proveedores.listar_proveedores'))

    # 2. Si llegó aquí, es admin. Buscamos el proveedor.
    proveedor = Proveedor.query.get_or_404(id)

    try:
        # 3. Actualización de todos los campos
        proveedor.tipo_tercero = request.form.get('tipo_tercero')
        proveedor.documento = request.form.get('documento')
        proveedor.dv = request.form.get('dv')
        proveedor.razon_social = request.form.get('razon_social')
        proveedor.primer_nombre = request.form.get('primer_nombre')
        proveedor.segundo_nombre = request.form.get('segundo_nombre')
        proveedor.primer_apellido = request.form.get('primer_apellido')
        proveedor.segundo_apellido = request.form.get('segundo_apellido')
        proveedor.direccion = request.form.get('direccion')
        proveedor.departamento = request.form.get('departamento')
        proveedor.ciudad = request.form.get('ciudad')
        proveedor.correo_electronico = request.form.get('correo_electronico')
        proveedor.movil = request.form.get('movil')
        proveedor.renta = request.form.get('renta')
        proveedor.banco = request.form.get('banco')
        proveedor.no_cuenta = request.form.get('no_cuenta')

        db.session.commit()
        flash('Información del proveedor actualizada correctamente por el administrador.', 'success')

    except IntegrityError:
        db.session.rollback()
        flash('Error: El número de documento ya existe en el sistema.', 'danger')
    except Exception as e:
        db.session.rollback()
        flash(f'Error inesperado al actualizar: {str(e)}', 'danger')
    
    return redirect(url_for('proveedores.listar_proveedores'))

@proveedores_bp.route('/eliminar/<int:id>')
@login_required
def eliminar_proveedor(id):
    # 1. BLINDAJE DE SEGURIDAD: Solo el admin puede entrar aquí
    if current_user.rol != 'admin':
        flash('Acceso denegado: Solo el administrador puede eliminar proveedores del catálogo maestro.', 'danger')
        return redirect(url_for('proveedores.listar_proveedores'))

    # 2. Si es admin, buscamos el proveedor
    proveedor = Proveedor.query.get_or_404(id)
    
    try:
        # 3. Borrado físico de la base de datos
        db.session.delete(proveedor)
        db.session.commit()
        flash('Proveedor eliminado permanentemente del sistema.', 'warning')

    except Exception as e:
        db.session.rollback()
        # Esto protege la integridad si el proveedor ya tiene facturas o registros
        flash('No se puede eliminar: el proveedor tiene registros contables asociados en uno o más colegios.', 'danger')
    
    return redirect(url_for('proveedores.listar_proveedores'))

@proveedores_bp.route('/obtener/<int:id>')
@login_required
def obtener_proveedor_json(id):
    # 1. Buscamos el proveedor
    p = Proveedor.query.get_or_404(id)
    
    # 2. Validación de seguridad (Contadores/Admin)
    if current_user.rol != 'admin':
        es_mio = p.colegios_vinculados.filter(Colegio.usuario_id == current_user.id).first()
        if not es_mio:
            return {"error": "No autorizado para ver este proveedor"}, 403

    # --- 3. LÓGICA DE PRIORIDAD PARA EL NOMBRE (IGUAL AL LISTAR) ---
    p_nom = (p.primer_nombre or "").strip()
    p_ape = (p.primer_apellido or "").strip()
    r_soc = (p.razon_social or "").strip()

    if p_nom and p_nom.lower() != 'none':
        nombre_bonito = f"{p_nom} {p_ape}".strip()
    elif r_soc and r_soc.lower() != 'none' and r_soc != '0':
        nombre_bonito = r_soc
    else:
        nombre_bonito = f"NIT/CC: {p.documento}"

    # 4. Retorno de datos ajustado para el Modal
    return {
        "id": p.id,
        "nombre_para_mostrar": nombre_bonito, # <--- Usar este en los títulos del modal
        "tipo_tercero": p.tipo_tercero,
        "documento": p.documento,
        "dv": p.dv,
        "documento_full": f"{p.documento}-{p.dv}" if p.dv else p.documento,
        "razon_social": p.razon_social,
        "p_nombre": p.primer_nombre or "-",
        "s_nombre": p.segundo_nombre or "-",
        "p_apellido": p.primer_apellido or "-",
        "s_apellido": p.segundo_apellido or "-",
        "direccion": p.direccion or "-",
        "ubicacion_full": f"{p.ciudad or ''} / {p.departamento or ''}",
        "movil": p.movil or p.telefono or "-", 
        "correo": p.correo_electronico or "-",
        "renta": p.renta or "-",
        "banco": p.banco or "-",
        "cuenta": p.no_cuenta or "-"
    }
@proveedores_bp.route('/proveedores_json_paginado')
@login_required
def proveedores_json_paginado():
    try:
        # 1. Obtener parámetros de la URL
        page = request.args.get('page', 1, type=int)
        search_query = request.args.get('q', '').strip()  # Capturamos el término de búsqueda
        per_page = 12

        # 2. Construir la consulta base
        query = Proveedor.query

        # 3. Aplicar filtros si hay una búsqueda
        if search_query:
            search_filter = f"%{search_query}%"
            query = query.filter(
                or_(
                    Proveedor.documento.ilike(search_filter),
                    Proveedor.razon_social.ilike(search_filter),
                    Proveedor.primer_nombre.ilike(search_filter),
                    Proveedor.primer_apellido.ilike(search_filter),
                    Proveedor.correo_electronico.ilike(search_filter)
                )
            )

        # 4. Ordenar y Paginar
        pagination = query.order_by(Proveedor.razon_social.asc(), Proveedor.primer_nombre.asc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        resultado = []
        for p in pagination.items:
            # Mantenemos tu lógica de datos para el modal y la tabla
            resultado.append({
                "id": p.id,
                "tipo_tercero": p.tipo_tercero,
                "documento": p.documento,
                "documento_limpio": p.documento,
                "dv": p.dv,
                "razon_social": p.razon_social,
                "primer_nombre": p.primer_nombre,
                "segundo_nombre": p.segundo_nombre,
                "primer_apellido": p.primer_apellido,
                "segundo_apellido": p.segundo_apellido,
                "direccion": p.direccion,
                "departamento": p.departamento,
                "ciudad": p.ciudad,
                "correo": p.correo_electronico,
                "movil": p.movil,
                "renta": p.renta,
                "banco": p.banco,
                "no_cuenta": p.no_cuenta
            })

        # 5. Retornar JSON con metadatos de paginación
        return jsonify({
            "proveedores": resultado,
            "total_paginas": pagination.pages,
            "pagina_actual": pagination.page,
            "tiene_siguiente": pagination.has_next,
            "tiene_anterior": pagination.has_prev,
            "total_registros": pagination.total
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500