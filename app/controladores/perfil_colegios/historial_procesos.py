from flask import Blueprint, jsonify
from app.modelos.models import ProcesoContractual, Proveedor, ItemProceso
from app import db
import traceback

# 1. DEFINICIÓN DEL BLUEPRINT
historial_bp = Blueprint('historial', __name__)

# 2. RUTA DEL HISTORIAL
@historial_bp.route('/historial_json/<int:colegio_id>')
def historial_json(colegio_id):
    try:
        procesos = ProcesoContractual.query.filter_by(colegio_id=colegio_id)\
                   .order_by(ProcesoContractual.id.desc()).all()
        
        resultado = []
        for p in procesos:
            prov = Proveedor.query.get(p.proveedor_id)
            nombre_final = "SIN NOMBRE"
            documento_final = "N/A"
            
            if prov:
                documento_final = prov.documento if prov.documento else "N/A"
                
                # --- LÓGICA INTELIGENTE PARA EL NOMBRE ---
                razon = prov.razon_social.strip() if prov.razon_social else ""
                
                # Paso 1: Intentamos armar el nombre de persona natural por si acaso
                nombres_persona = [prov.primer_nombre, prov.segundo_nombre, 
                                  prov.primer_apellido, prov.segundo_apellido]
                nombre_persona_natural = " ".join([part for part in nombres_persona if part]).strip()

                # Paso 2: Decidimos qué mostrar
                # Si tiene razón social Y no es solo un número, es la prioridad
                if razon and not razon.isdigit():
                    nombre_final = razon
                # Si la razón social es un número o está vacía, usamos el nombre de persona
                elif nombre_persona_natural:
                    nombre_final = nombre_persona_natural
                # Si no hay nada, el plan de emergencia es usar el documento
                else:
                    nombre_final = f"CONTRATISTA {documento_final}"

            # Cálculo del total sumando los items
            total_proceso = sum(item.v_total for item in p.detalles_items) if p.detalles_items else 0
            
            resultado.append({
                 'id': p.id,
                 'vigencia': p.vigencia,
                 'tipo_contrato': p.tipo_contrato or "No definido",
                 'objeto': p.objeto_desc or "Sin objeto registrado",
                 'objeto_corto': (p.objeto_desc[:85] + '...') if p.objeto_desc and len(p.objeto_desc) > 85 else (p.objeto_desc or "Sin objeto"),
                 'proveedor': nombre_final.upper(),
                 'nit_proveedor': documento_final,
                 'valor': f"${total_proceso:,.0f}",
                 'plazo': p.plazo_txt or "No definido",
                 'fecha_creacion': p.fecha_creacion.strftime('%d/%m/%Y') if p.fecha_creacion else "N/A"
             })
        
        return jsonify(resultado)
    except Exception as e:
        print("---------- ERROR CRÍTICO EN CONTROLADOR ----------")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500