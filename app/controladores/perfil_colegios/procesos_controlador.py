from flask import Blueprint, request, jsonify
from app import db
from app.modelos.models import ProcesoContractual, ItemProceso
from datetime import datetime

procesos_bp = Blueprint('procesos', __name__)

@procesos_bp.route('/guardar_proceso/<int:colegio_id>', methods=['POST'])
def guardar_proceso(colegio_id):
    try:
        data = request.get_json()
        
        def parse_date(date_str):
            if not date_str: return None
            try: return datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError: return None

        # --- LÓGICA DEL PROMEDIO ---
        # 1. Calculamos el total de la Propuesta 1 sumando sus ítems
        items_data = data.get('items', [])
        total_p1 = sum(float(item.get('v_total') or 0) for item in items_data)
        
        # 2. Obtenemos los valores de propuesta 2 y 3
        v2 = float(data.get('valor_propuesta2') or 0)
        v3 = float(data.get('valor_propuesta3') or 0)

        # 3. Metemos en una lista solo los que son mayores a 0 para promediar
        # Incluimos total_p1 si es mayor a 0
        valores_para_promedio = [v for v in [total_p1, v2, v3] if v > 0]
        
        # 4. Calculamos el promedio (solo si hay al menos 2 propuestas)
        # Si solo hay 1, el promedio es 0 o ese mismo valor (tú decides)
        promedio_final = sum(valores_para_promedio) / len(valores_para_promedio) if len(valores_para_promedio) >= 2 else 0
        # ---------------------------

        # 1. Crear cabecera (INCLUYENDO GRAN TOTAL Y PROMEDIO)
        nuevo_proceso = ProcesoContractual(
            colegio_id=colegio_id,
            proveedor_id=data.get('proveedor_id'),
            proveedor2_id=data.get('proveedor2_id') if data.get('proveedor2_id') else None,
            proveedor3_id=data.get('proveedor3_id') if data.get('proveedor3_id') else None,
            
            gran_total=total_p1, # Guardamos el total calculado
            valor_propuesta2=v2,
            valor_propuesta3=v3,
            promedio_propuestas=promedio_final, # <--- GUARDAMOS EL PROMEDIO

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
        db.session.flush() 

        # 2. Guardar ítems
        for item in items_data:
            descripcion = item.get('descripcion', '').strip()
            if descripcion:
                nuevo_item = ItemProceso(
                    proceso_id=nuevo_proceso.id,
                    cantidad=float(item.get('cantidad') or 0),
                    codigo_clasificador=item.get('codigo_clasificador'),
                    descripcion=descripcion,
                    v_unitario=float(item.get('v_unitario') or 0),
                    v_total=float(item.get('v_total') or 0)
                )
                db.session.add(nuevo_item)

        db.session.commit()
        return jsonify({
            "status": "success", 
            "message": "Expediente guardado con promedio",
            "proceso_id": nuevo_proceso.id,
            "promedio": promedio_final
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error al guardar: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500