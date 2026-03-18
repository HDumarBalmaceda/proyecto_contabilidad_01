from flask import Blueprint, jsonify, abort, request
from app.modelos.models import ProcesoContractual, Proveedor, ItemProceso, Colegio # <<< Importamos Colegio
from app import db
import traceback
from flask_login import login_required, current_user
from sqlalchemy import or_, cast, String

# 1. DEFINICIÓN DEL BLUEPRINT
historial_bp = Blueprint('historial', __name__)

# 2. RUTA DEL HISTORIAL BLINDADA
@historial_bp.route('/historial_json/<int:colegio_id>')
@login_required
def historial_json(colegio_id):
    try:
        # 1. SEGURIDAD
        colegio = Colegio.query.get_or_404(colegio_id)
        if current_user.rol != 'admin' and colegio.usuario_id != current_user.id:
            return jsonify({"error": "Acceso no autorizado"}), 403

        # 2. PARÁMETROS
        page = request.args.get('page', 1, type=int)
        search_query = request.args.get('q', '').strip()
        # Nuevo parámetro: orden (por defecto desc)
        orden = request.args.get('orden', 'desc') 
        per_page = 10 

        # 3. CONSULTA BASE
        query = ProcesoContractual.query.outerjoin(Proveedor, ProcesoContractual.proveedor_id == Proveedor.id)\
            .filter(ProcesoContractual.colegio_id == colegio_id)

        # Filtros de búsqueda (Global)
        if search_query:
            search_filter = f"%{search_query}%"
            query = query.filter(
                or_(
                    cast(ProcesoContractual.numero_proceso_colegio, String).ilike(search_filter),
                    ProcesoContractual.tipo_contrato.ilike(search_filter),
                    ProcesoContractual.vigencia.ilike(search_filter),
                    ProcesoContractual.objeto_desc.ilike(search_filter),
                    Proveedor.documento.ilike(search_filter),
                    Proveedor.razon_social.ilike(search_filter),
                    Proveedor.primer_nombre.ilike(search_filter),
                    Proveedor.primer_apellido.ilike(search_filter)
                )
            )

        # 4. APLICAR ORDEN DINÁMICO
        # Ordenamos por ID (o podrías usar fecha_creacion)
        if orden == 'asc':
            query = query.order_by(ProcesoContractual.id.asc())
        else:
            query = query.order_by(ProcesoContractual.id.desc())

        # 5. PAGINACIÓN
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        procesos_pagina = pagination.items

        # --- Mapeo de resultados para JSON ---
        resultado_lista = []
        for p in procesos_pagina:
            prov = p.proveedor 
            nombre_final = "SIN NOMBRE"
            documento_final = prov.documento if prov else "N/A"
            
            if prov:
                razon = prov.razon_social.strip() if prov.razon_social else ""
                nombres_persona = [prov.primer_nombre, prov.segundo_nombre, 
                                  prov.primer_apellido, prov.segundo_apellido]
                nombre_persona_natural = " ".join([part for part in nombres_persona if part]).strip()

                if razon and not razon.isdigit():
                    nombre_final = razon
                elif nombre_persona_natural:
                    nombre_final = nombre_persona_natural
                else:
                    nombre_final = f"CONTRATISTA {documento_final}"

            total_proceso = sum(item.v_total for item in p.detalles_items) if p.detalles_items else 0
            
            resultado_lista.append({
                 'id': p.id,
                 'vigencia': p.vigencia,
                 'tipo_contrato': p.tipo_contrato or "No definido",
                 'objeto_corto': (p.objeto_desc[:85] + '...') if p.objeto_desc and len(p.objeto_desc) > 85 else (p.objeto_desc or "Sin objeto"),
                 'proveedor': nombre_final.upper(),
                 'nit_proveedor': documento_final,
                 'numero_proceso_colegio': p.numero_proceso_colegio,
                 'valor': f"${total_proceso:,.0f}",
                 'plazo': p.plazo_txt,
                 'fecha_creacion': p.fecha_creacion.strftime('%d/%m/%Y') if p.fecha_creacion else "N/A"
            })
        
        return jsonify({
            'procesos': resultado_lista,
            'total_paginas': pagination.pages,
            'pagina_actual': pagination.page,
            'tiene_siguiente': pagination.has_next,
            'tiene_anterior': pagination.has_prev,
            'total_registros': pagination.total,
            'orden_actual': orden # Devolvemos el orden aplicado
        })
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500