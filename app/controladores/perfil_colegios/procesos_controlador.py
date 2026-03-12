from flask import Blueprint, request, jsonify
from app import db
from app.modelos.models import ProcesoContractual, ItemProceso
from datetime import datetime
from flask_login import login_required, current_user

procesos_bp = Blueprint('procesos', __name__)

@procesos_bp.route('/guardar_proceso/<int:colegio_id>', methods=['POST'])
@login_required
def guardar_proceso(colegio_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No se recibieron datos"}), 400

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

        # 1. Procesar Ítems y Totales
        items_data = data.get('items', [])
        total_p1 = sum(safe_float(item.get('v_total')) for item in items_data)
        v2 = safe_float(data.get('valor_propuesta2'))
        v3 = safe_float(data.get('valor_propuesta3'))
        
        # Promedio (solo de valores mayores a 0)
        valores = [v for v in [total_p1, v2, v3] if v > 0]
        promedio_final = sum(valores) / len(valores) if len(valores) >= 2 else 0

        # 2. Buscar o Crear Proceso
        if proceso_id: 
            # Si el proceso ya existe, lo cargamos para editarlo
            proceso = ProcesoContractual.query.get_or_404(proceso_id)
            # Borramos los ítems anteriores para insertar los nuevos sin duplicar
            ItemProceso.query.filter_by(proceso_id=proceso.id).delete()
        else:
            # --- LÓGICA DE CONSECUTIVO AUTOMÁTICO ---
            from sqlalchemy import func
            
            # Buscamos directamente el número máximo existente para este colegio
            max_numero = db.session.query(func.max(ProcesoContractual.numero_proceso_colegio))\
                .filter(ProcesoContractual.colegio_id == colegio_id).scalar()
            
            # Si es el primer proceso del colegio (None), empezamos en 1.
            # Si ya hay procesos, le sumamos 1 al número más alto.
            nuevo_consecutivo = (max_numero or 0) + 1
            
            # Creamos el nuevo registro con su número único por colegio
            proceso = ProcesoContractual(
                colegio_id=colegio_id, 
                numero_proceso_colegio=nuevo_consecutivo
            )
            db.session.add(proceso)

        # 3. Mapeo Blindado de Campos
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

        # Fechas
        proceso.f_elaboracion = parse_date(data.get('f_elaboracion'))
        proceso.f_publicacion = parse_date(data.get('f_publicacion'))
        proceso.f_recepcion = parse_date(data.get('f_recepcion'))
        proceso.f_cierre = parse_date(data.get('f_cierre'))
        proceso.f_verificacion = parse_date(data.get('f_verificacion'))
        proceso.f_firma = parse_date(data.get('f_firma'))
        proceso.f_recibido = parse_date(data.get('f_recibido'))

        db.session.flush()

        # 4. Insertar Ítems
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
        return jsonify({"success": True, "proceso_id": proceso.id, "status": "success"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"CRITICAL ERROR: {str(e)}") # Esto sale en tu terminal de VS Code
        return jsonify({"success": False, "message": str(e)}), 500

@procesos_bp.route('/obtener_proceso/<int:id>')
@login_required
def obtener_proceso(id):
    p = ProcesoContractual.query.get_or_404(id)
    
    # Preparamos los items para el JS
    items = [{
        'id': item.id,
        'descripcion': item.descripcion,
        'cantidad': item.cantidad,
        'codigo_clasificador': item.codigo_clasificador,
        'v_unitario': item.v_unitario,
        'v_total': item.v_total
    } for item in p.detalles_items]

    return jsonify({
        # Identificadores y Números
        'id': p.id,
        'numero_proceso_colegio': p.numero_proceso_colegio,
        'colegio_id': p.colegio_id,
        'vigencia': p.vigencia,
        
        # Proveedores y Propuestas
        'proveedor_id': p.proveedor_id,
        'proveedor2_id': p.proveedor2_id,
        'proveedor3_id': p.proveedor3_id,
        'valor_propuesta2': p.valor_propuesta2,
        'valor_propuesta3': p.valor_propuesta3,
        'gran_total': p.gran_total,
        'promedio_propuestas': p.promedio_propuestas,

        # Información del Contrato
        'tipo_contrato': p.tipo_contrato,
        'objeto_desc': p.objeto_desc,
        'plazo_txt': p.plazo_txt,
        
        # Información Presupuestal
        'cdp_numero': p.cdp_numero,
        'rubro_nombre': p.rubro_nombre,
        'cod_presupuestal': p.cod_presupuestal,

        # Cronograma de Fechas (Formateadas para el input date)
        'f_elaboracion': p.f_elaboracion.isoformat() if p.f_elaboracion else '',
        'f_publicacion': p.f_publicacion.isoformat() if p.f_publicacion else '',
        'f_recepcion': p.f_recepcion.isoformat() if p.f_recepcion else '',
        'f_cierre': p.f_cierre.isoformat() if p.f_cierre else '',
        'f_verificacion': p.f_verificacion.isoformat() if p.f_verificacion else '',
        'f_firma': p.f_firma.isoformat() if p.f_firma else '',
        'f_recibido': p.f_recibido.isoformat() if p.f_recibido else '',
        
        # Lista de Items
        'items': items
    })