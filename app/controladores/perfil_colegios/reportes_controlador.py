from flask import Blueprint, request, current_app, send_file, jsonify
from app.modelos.models import ProcesoContractual, Colegio, Proveedor
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
import os, re, zipfile, pythoncom
from io import BytesIO
from num2words import num2words
try:
    from docx2pdf import convert
except ImportError:
    pass

reportes_bp = Blueprint('reportes', __name__)

def obtener_contexto_proceso(proceso_id):
    """Extrae y organiza todos los datos con total en letras"""
    proceso = ProcesoContractual.query.get_or_404(proceso_id)
    colegio = Colegio.query.get(proceso.colegio_id)
    proveedor = Proveedor.query.get(proceso.proveedor_id)

    nombre_col_limpio = re.sub(r'[^\w\s-]', '', colegio.nombre).replace(" ", "_").upper()

    items_tabla = []
    total_acumulado = 0
    items_query = proceso.detalles_items if hasattr(proceso, 'detalles_items') else proceso.details_items
    
    for item in items_query:
        cant_limpia = int(item.cantidad) if item.cantidad % 1 == 0 else item.cantidad
        items_tabla.append({
            'cant': cant_limpia,
            'cod': str(item.codigo_clasificador or '').strip(),
            'desc': str(item.descripcion or '').strip(),
            'unit': f"{item.v_unitario:,.0f}",
            'total': f"{item.v_total:,.0f}"
        })
        total_acumulado += item.v_total

    # Conversión del total a letras (Movido antes del return)
    try:
        # Convertimos a letras
        texto_letras = num2words(total_acumulado, lang='es').upper()
        
        # Ajuste gramatical para contratos colombianos
        if 'MILLON' in texto_letras:
            total_letras_final = f"{texto_letras}  PESOS ML"
        else:
            total_letras_final = f"{texto_letras} PESOS ML"
    except Exception as e:
        print(f"Error en num2words: {e}")
        total_letras_final = "ERROR EN CONVERSIÓN"

    if proveedor.razon_social and not str(proveedor.razon_social).isdigit():
        nombre_final_contratista = proveedor.razon_social
    else:
        nombre_final_contratista = f"{proveedor.primer_nombre or ''} {proveedor.primer_apellido or ''}".strip()

    # Construimos el diccionario final CON TODO
    contexto = {
        'col_nombre': colegio.nombre.upper(),
        'col_nit': colegio.nit,
        'col_municipio': colegio.municipio,
        'col_direccion': colegio.direccion,
        'col_rector': colegio.rector_nombre,
        'doc_rector':colegio.rector_documento,
        'vigencia': proceso.vigencia,
        'tipo_contrato': proceso.tipo_contrato,
        'objeto': proceso.objeto_desc,
        'contratista': nombre_final_contratista.upper(),
        'doc_contratista': proveedor.documento,
        'cdp_numero': proceso.cdp_numero,
        'cod_presupuestal': proceso.cod_presupuestal,
        'f_elaboracion': proceso.f_elaboracion.strftime('%d/%m/%Y') if proceso.f_elaboracion else "",
        'f_publicacion': proceso.f_publicacion.strftime('%d/%m/%Y') if proceso.f_publicacion else "",
        'f_recepcion': proceso.f_recepcion.strftime('%d/%m/%Y') if proceso.f_recepcion else "",
        'f_cierre': proceso.f_cierre.strftime('%d/%m/%Y') if proceso.f_cierre else "",
        'f_verificacion': proceso.f_verificacion.strftime('%d/%m/%Y') if proceso.f_verificacion else "",
        'f_firma': proceso.f_firma.strftime('%d/%m/%Y') if proceso.f_firma else "",
        'plazo_txt': proceso.plazo_txt,
        'items': items_tabla,
        'total_final': f"${total_acumulado:,.0f}",
        'total_letras': total_letras_final  # <--- Ahora sí llega al documento
    }
    
    # Único return al final de la función
    return contexto, colegio, nombre_col_limpio

@reportes_bp.route('/obtener_lista_plantillas')
def lista_plantillas():
    ruta = os.path.join(current_app.root_path, 'static', 'plantillas')
    archivos = sorted([f for f in os.listdir(ruta) if f.endswith('.docx')])
    return jsonify(archivos)

# ... (restante del código igual arriba)

@reportes_bp.route('/descargar_zip/<int:proceso_id>')
def descargar_zip(proceso_id):
    formato = request.args.get('formato', 'word').lower()
    try:
        contexto, colegio, nombre_col_limpio = obtener_contexto_proceso(proceso_id)
        ruta_plantillas = os.path.join(current_app.root_path, 'static', 'plantillas')
        archivos_docs = sorted([f for f in os.listdir(ruta_plantillas) if f.endswith('.docx')])
        ruta_temp = os.path.join(current_app.root_path, 'static', 'temp')
        os.makedirs(ruta_temp, exist_ok=True)
        
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w') as zf:
            for i, nombre_p in enumerate(archivos_docs, start=1):
                doc = DocxTemplate(os.path.join(ruta_plantillas, nombre_p))
                
                # --- PROCESAR LOGO ---
                if colegio.logo_path:
                    r_logo = os.path.join(current_app.root_path, 'static', 'uploads', colegio.logo_path)
                    if os.path.exists(r_logo):
                        contexto['logo'] = InlineImage(doc, r_logo, width=Mm(25))

                # --- PROCESAR FIRMA ---
                if colegio.firma_path:
                    r_firma = os.path.join(current_app.root_path, 'static', 'uploads', colegio.firma_path)
                    if os.path.exists(r_firma):
                        contexto['firma'] = InlineImage(doc, r_firma, width=Mm(45))

                doc.render(contexto)
                
                conteo = str(i).zfill(2)
                nombre_plantilla_limpio = os.path.splitext(nombre_p)[0].upper()
                nombre_base_final = f"{conteo}_{nombre_plantilla_limpio}_{nombre_col_limpio}"
                
                # Ruta temporal del Word
                path_word = os.path.join(ruta_temp, f"{nombre_base_final}.docx")
                doc.save(path_word)
                
                # --- LÓGICA DE INCLUSIÓN EN EL ZIP ---
                if formato == 'pdf':
                    try:
                        import pythoncom
                        pythoncom.CoInitialize() # Necesario para hilos en Windows
                        path_pdf = path_word.replace(".docx", ".pdf")
                        convert(path_word, path_pdf) # Conversión a PDF
                        # Metemos el PDF al ZIP
                        zf.write(path_pdf, arcname=f"{nombre_base_final}.pdf")
                        # Opcional: limpiar archivos temporales
                        # os.remove(path_pdf) 
                    except Exception as e:
                        print(f"Error convirtiendo a PDF en ZIP: {e}")
                        # Si falla el PDF, metemos el Word para que el ZIP no vaya vacío
                        zf.write(path_word, arcname=f"{nombre_base_final}.docx")
                else:
                    # Metemos el Word al ZIP (Caso por defecto)
                    zf.write(path_word, arcname=f"{nombre_base_final}.docx")
                
                # Opcional: eliminar el Word temporal después de meterlo al ZIP
                # os.remove(path_word)

        zip_buffer.seek(0)
        return send_file(
            zip_buffer, 
            mimetype='application/zip', 
            as_attachment=True, 
            download_name=f"PAQUETE_{nombre_col_limpio}.zip"
        )
    except Exception as e:
        print(f"ERROR GENERANDO ZIP: {str(e)}")
        return f"Error: {str(e)}", 500

@reportes_bp.route('/descargar_individual/<int:proceso_id>/<string:nombre_p>')
def descargar_individual(proceso_id, nombre_p):
    formato = request.args.get('formato', 'word').lower()
    try:
        contexto, colegio, nombre_col_limpio = obtener_contexto_proceso(proceso_id)
        ruta_plantillas = os.path.join(current_app.root_path, 'static', 'plantillas')
        archivos_docs = sorted([f for f in os.listdir(ruta_plantillas) if f.endswith('.docx')])
        
        try:
            indice = archivos_docs.index(nombre_p) + 1
        except ValueError:
            indice = 0
            
        conteo = str(indice).zfill(2)
        doc = DocxTemplate(os.path.join(ruta_plantillas, nombre_p))

        # --- PROCESAR LOGO ---
        if colegio.logo_path:
            r_logo = os.path.join(current_app.root_path, 'static', 'uploads', colegio.logo_path)
            if os.path.exists(r_logo):
                contexto['logo'] = InlineImage(doc, r_logo, width=Mm(25))

        # --- PROCESAR FIRMA ---
        if colegio.firma_path:
            r_firma = os.path.join(current_app.root_path, 'static', 'uploads', colegio.firma_path)
            if os.path.exists(r_firma):
                contexto['firma'] = InlineImage(doc, r_firma, width=Mm(45))

        doc.render(contexto)
        
        nombre_plantilla_limpio = os.path.splitext(nombre_p)[0].upper()
        nombre_base_final = f"{conteo}_{nombre_plantilla_limpio}_{nombre_col_limpio}"
        ruta_temp = os.path.join(current_app.root_path, 'static', 'temp')
        os.makedirs(ruta_temp, exist_ok=True)
        
        path_word = os.path.join(ruta_temp, f"{nombre_base_final}.docx")
        doc.save(path_word)
        
        # --- LÓGICA DE ENVÍO ---
        archivo_a_enviar = path_word
        nombre_final_con_ext = f"{nombre_base_final}.docx"
        mimetype_final = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

        # --- AQUÍ ESTABA EL DAÑO: Si es PDF, convertimos ---
        if formato == 'pdf':
            try:
                import pythoncom
                pythoncom.CoInitialize()
                path_pdf = path_word.replace(".docx", ".pdf")
                convert(path_word, path_pdf) # Esta es la función de docx2pdf
                archivo_a_enviar = path_pdf
                nombre_final_con_ext = f"{nombre_base_final}.pdf"
                mimetype_final = 'application/pdf'
            except Exception as e:
                print(f"Error convirtiendo a PDF: {e}")
                # Si falla la conversión, enviará el Word por defecto para no bloquear al usuario

        return send_file(
            archivo_a_enviar, 
            as_attachment=True, 
            download_name=nombre_final_con_ext,
            mimetype=mimetype_final
        )

    except Exception as e:
        print(f"ERROR EN DESCARGA: {str(e)}") 
        return f"Error: {str(e)}", 500