from flask import Blueprint, request, jsonify
from app import db
from app.modelos.models import ProcesoContractual, ItemProceso
from datetime import datetime

procesos_bp = Blueprint('procesos', __name__)

@procesos_bp.route('/guardar_proceso/<int:colegio_id>', methods=['POST'])
@procesos_bp.route('/guardar_proceso/<int:colegio_id>', methods=['POST'])
def guardar_proceso(colegio_id):
    try:
        data = request.get_json()
        
        # 1. Validación rápida de datos de entrada
        def safe_float(val):
            try: return float(val or 0)
            except: return 0.0

        def parse_date(date_str):
            if not date_str: return None
            try: return datetime.strptime(date_str, '%Y-%m-%d').date()
            except: return None

        # 2. Lógica de Totales y Promedio (Optimizada)
        items_data = data.get('items', [])
        total_p1 = sum(safe_float(item.get('v_total')) for item in items_data)
        v2 = safe_float(data.get('valor_propuesta2'))
        v3 = safe_float(data.get('valor_propuesta3'))

        valores = [v for v in [total_p1, v2, v3] if v > 0]
        promedio_final = sum(valores) / len(valores) if len(valores) >= 2 else 0

        # 3. Crear cabecera
        nuevo_proceso = ProcesoContractual(
            colegio_id=colegio_id,
            proveedor_id=data.get('proveedor_id'),
            proveedor2_id=data.get('proveedor2_id') or None,
            proveedor3_id=data.get('proveedor3_id') or None,
            gran_total=total_p1,
            valor_propuesta2=v2,
            valor_propuesta3=v3,
            promedio_propuestas=promedio_final,
            vigencia=data.get('vigencia'),
            tipo_contrato=data.get('tipo_contrato'),
            objeto_desc=data.get('objeto_desc'),
            f_elaboracion=parse_date(data.get('f_elaboracion')),
            f_publicacion=parse_date(data.get('f_publicacion')),
            f_recepcion=parse_date(data.get('f_recepcion')),
            f_cierre=parse_date(data.get('f_cierre')),
            f_verificacion=parse_date(data.get('f_verificacion')),
            f_firma=parse_date(data.get('f_firma')),
            f_recibido=parse_date(data.get('f_recibido')),
            plazo_txt=data.get('plazo_txt'),
            cdp_numero=data.get('cdp_numero'),
            rubro_nombre=data.get('rubro_nombre'),
            cod_presupuestal=data.get('cod_presupuestal')
        )

        db.session.add(nuevo_proceso)
        db.session.flush() # Para obtener el ID del proceso

        # 4. Inserción Masiva de Ítems (MÁS RÁPIDO)
        objetos_items = []
        for item in items_data:
            desc = item.get('descripcion', '').strip()
            if desc:
                objetos_items.append(ItemProceso(
                    proceso_id=nuevo_proceso.id,
                    cantidad=safe_float(item.get('cantidad')),
                    codigo_clasificador=item.get('codigo_clasificador'),
                    descripcion=desc,
                    v_unitario=safe_float(item.get('v_unitario')),
                    v_total=safe_float(item.get('v_total'))
                ))
        
        if objetos_items:
            db.session.add_all(objetos_items) # <--- Inserta todo de una vez

        db.session.commit()
        
        return jsonify({
            "status": "success", 
            "proceso_id": nuevo_proceso.id,
            "promedio": promedio_final
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500