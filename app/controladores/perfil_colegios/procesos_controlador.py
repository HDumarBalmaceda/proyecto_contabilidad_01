from flask import Blueprint, request, jsonify
from app import db
from app.modelos.models import ProcesoContractual, ItemProceso, Colegio
from datetime import datetime
from flask_login import login_required, current_user

procesos_bp = Blueprint('procesos', __name__)

@procesos_bp.route('/guardar_proceso/<int:colegio_id>', methods=['POST'])
@login_required
def guardar_proceso(colegio_id):
    try:
        data = request.get_json()
        print(f"DEBUG: Datos recibidos -> {data}") # ESTO APARECERÁ EN TU TERMINAL NEGRA

        colegio = Colegio.query.get_or_404(colegio_id)
        
        # SEGURIDAD: Solo el admin o el dueño del colegio
        if current_user.rol != 'admin' and colegio.usuario_id != current_user.id:
            return jsonify({"success": False, "message": "Acceso denegado."}), 403

        data = request.get_json()
        proceso_id = data.get('proceso_id') 

        # --- FUNCIONES DE LIMPIEZA ---
        def safe_float(val):
            try: return float(val) if val not in [None, ""] else 0.0
            except: return 0.0
        def safe_int(val):
            try: return int(val) if val not in [None, ""] else None
            except: return None
        def parse_date(date_str):
            if not date_str or date_str == "": return None
            try: return datetime.strptime(date_str, '%Y-%m-%d').date()
            except: return None

        items_data = data.get('items', [])
        total_p1 = sum(safe_float(item.get('v_total')) for item in items_data)
        v2 = safe_float(data.get('valor_propuesta2'))
        v3 = safe_float(data.get('valor_propuesta3'))
        
        valores = [v for v in [total_p1, v2, v3] if v > 0]
        promedio_final = sum(valores) / len(valores) if len(valores) >= 2 else 0

        if proceso_id: 
            proceso = ProcesoContractual.query.get_or_404(proceso_id)
            if proceso.colegio_id != colegio_id:
                return jsonify({"success": False, "message": "Error de integridad."}), 400
            ItemProceso.query.filter_by(proceso_id=proceso.id).delete()
        else:
            from sqlalchemy import func
            max_numero = db.session.query(func.max(ProcesoContractual.numero_proceso_colegio))\
                .filter(ProcesoContractual.colegio_id == colegio_id).scalar()
            proceso = ProcesoContractual(colegio_id=colegio_id, numero_proceso_colegio=(max_numero or 0) + 1)
            db.session.add(proceso)

        # Mapeo de campos
        proceso.proveedor_id = safe_int(data.get('proveedor_id'))
        proceso.proveedor2_id = safe_int(data.get('proveedor2_id'))
        proceso.proveedor3_id = safe_int(data.get('proveedor3_id'))
        proceso.vigencia = safe_int(data.get('vigencia')) or 2026
        proceso.tipo_contrato = data.get('tipo_contrato')
        proceso.objeto_desc = data.get('objeto_desc')
        proceso.plazo_txt = data.get('plazo_txt')
        proceso.cdp_numero = data.get('cdp_numero')
        proceso.rubro_nombre = data.get('rubro_nombre')
        proceso.cod_presupuestal = data.get('cod_presupuestal')
        proceso.gran_total = total_p1
        proceso.valor_propuesta2 = v2
        proceso.valor_propuesta3 = v3
        proceso.promedio_propuestas = promedio_final
        proceso.f_elaboracion = parse_date(data.get('f_elaboracion'))
        proceso.f_publicacion = parse_date(data.get('f_publicacion'))
        proceso.f_recepcion = parse_date(data.get('f_recepcion'))
        proceso.f_cierre = parse_date(data.get('f_cierre'))
        proceso.f_verificacion = parse_date(data.get('f_verificacion'))
        proceso.f_firma = parse_date(data.get('f_firma'))
        proceso.f_recibido = parse_date(data.get('f_recibido'))

        db.session.flush()
        for item in items_data:
            desc = item.get('descripcion', '').strip()
            if desc:
                db.session.add(ItemProceso(
                    proceso_id=proceso.id,
                    cantidad=safe_float(item.get('cantidad')),
                    codigo_clasificador=item.get('codigo_clasificador'),
                    descripcion=desc,
                    v_unitario=safe_float(item.get('v_unitario')),
                    v_total=safe_float(item.get('v_total'))
                ))
        db.session.commit()
        return jsonify({"success": True, "proceso_id": proceso.id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@procesos_bp.route('/obtener_proceso/<int:id>')
@login_required
def obtener_proceso(id):
    p = ProcesoContractual.query.get_or_404(id)
    colegio = Colegio.query.get(p.colegio_id)

    # SEGURIDAD: Validar propiedad
    if current_user.rol != 'admin' and (not colegio or colegio.usuario_id != current_user.id):
        return jsonify({"error": "Acceso denegado"}), 403

    items = [{
        'id': i.id, 'descripcion': i.descripcion, 'cantidad': i.cantidad,
        'codigo_clasificador': i.codigo_clasificador, 'v_unitario': i.v_unitario, 'v_total': i.v_total
    } for i in p.detalles_items]

    return jsonify({
        'id': p.id, 'numero_proceso_colegio': p.numero_proceso_colegio,
        'colegio_id': p.colegio_id, 'vigencia': p.vigencia,
        'proveedor_id': p.proveedor_id, 'proveedor2_id': p.proveedor2_id, 'proveedor3_id': p.proveedor3_id,
        'valor_propuesta2': p.valor_propuesta2, 'valor_propuesta3': p.valor_propuesta3,
        'gran_total': p.gran_total, 'promedio_propuestas': p.promedio_propuestas,
        'tipo_contrato': p.tipo_contrato, 'objeto_desc': p.objeto_desc, 'plazo_txt': p.plazo_txt,
        'cdp_numero': p.cdp_numero, 'rubro_nombre': p.rubro_nombre, 'cod_presupuestal': p.cod_presupuestal,
        'f_elaboracion': p.f_elaboracion.isoformat() if p.f_elaboracion else '',
        'f_publicacion': p.f_publicacion.isoformat() if p.f_publicacion else '',
        'f_recepcion': p.f_recepcion.isoformat() if p.f_recepcion else '',
        'f_cierre': p.f_cierre.isoformat() if p.f_cierre else '',
        'f_verificacion': p.f_verificacion.isoformat() if p.f_verificacion else '',
        'f_firma': p.f_firma.isoformat() if p.f_firma else '',
        'f_recibido': p.f_recibido.isoformat() if p.f_recibido else '',
        'items': items
    })

@procesos_bp.route('/colegios/obtener_proveedores/<int:colegio_id>')
@login_required
def obtener_proveedores_colegio(colegio_id):
    try:
        colegio = Colegio.query.get_or_404(colegio_id)
        
        # --- SEGURIDAD ---
        if current_user.rol != 'admin' and colegio.usuario_id != current_user.id:
            return jsonify({"error": "No tienes permiso para ver estos proveedores"}), 403
            
        data = []
        for p in colegio.proveedores:
            # --- LÓGICA ESPEJO DEL HISTORIAL ---
            razon = (p.razon_social or "").strip()
            documento_final = p.documento or "N/A"
            
            # Construir nombre de persona natural
            nombres_persona = [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
            nombre_persona_natural = " ".join([part for part in nombres_persona if part]).strip()

            # Decidir el nombre final (evitando ceros y nones)
            if razon and not razon.isdigit() and razon.lower() != 'none':
                nombre_final = razon
            elif nombre_persona_natural and nombre_persona_natural.lower() != 'none':
                nombre_final = nombre_persona_natural
            else:
                nombre_final = f"CONTRATISTA {documento_final}"

            # Enviamos el ID y el nombre ya procesado
            data.append({
                "id": p.id, 
                "nombre": nombre_final.upper() # <--- El JS buscará p.nombre
            })
            
        return jsonify(data), 200
    except Exception as e:
        import traceback
        print(traceback.format_exc()) # Para que veas el error real en tu terminal
        return jsonify({"error": str(e)}), 500


@procesos_bp.route('/eliminar_proceso/<int:id>', methods=['DELETE'])
@login_required
def eliminar_proceso(id):
    try:
        proceso = ProcesoContractual.query.get_or_404(id)
        colegio = Colegio.query.get(proceso.colegio_id)

        # SEGURIDAD: Solo admin o el dueño del colegio
        if current_user.rol != 'admin' and (not colegio or colegio.usuario_id != current_user.id):
            return jsonify({"success": False, "message": "No tienes permiso para eliminar este proceso."}), 403

        db.session.delete(proceso)
        db.session.commit()
        
        return jsonify({"success": True, "message": "Proceso eliminado correctamente."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500