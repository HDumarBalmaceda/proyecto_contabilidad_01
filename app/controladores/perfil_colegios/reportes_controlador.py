from flask import Blueprint, request, current_app, send_file, jsonify
from app.modelos.models import ProcesoContractual, Colegio, Proveedor
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
import os, re, zipfile, pythoncom
from io import BytesIO
from num2words import num2words
import threading
import pythoncom
try:
    from docx2pdf import convert
except ImportError:
    pass
pdf_lock = threading.Lock()
reportes_bp = Blueprint('reportes', __name__)

import locale


# --- 1. FUNCIONES DE FECHA (FUERA DE OTRAS FUNCIONES) ---
def fecha_texto_largo(fecha):
    if not fecha: return ""
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
             "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    return f"{fecha.day} de {meses[fecha.month - 1]} de {fecha.year}"

def fecha_texto_legal(fecha):
    if not fecha: return ""
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
             "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    
    dia_letras = "un" if fecha.day == 1 else num2words(fecha.day, lang='es').lower()
    anio_letras = num2words(fecha.year, lang='es').lower()
    
    return f"{dia_letras} ({fecha.day:02d}) días del mes de {meses[fecha.month - 1]} de {anio_letras} ({fecha.year})"


# --- 2. FUNCIÓN PRINCIPAL DEL CONTEXTO ---
def obtener_contexto_proceso(proceso_id):
    """Extrae datos y formatea fechas en estilo contractual largo"""
    proceso = ProcesoContractual.query.get_or_404(proceso_id)

    # DEBUG
    print(f"\nGenerando contexto para Proceso ID: {proceso_id}\n")

    colegio = Colegio.query.get(proceso.colegio_id)
    
    # 1. IDENTIFICACIÓN DE PROVEEDORES
    prov1 = Proveedor.query.get(proceso.proveedor_id)
    prov2 = Proveedor.query.get(getattr(proceso, 'proveedor2_id', None))
    prov3 = Proveedor.query.get(getattr(proceso, 'proveedor3_id', None))

    nombre_col_limpio = re.sub(r'[^\w\s-]', '', colegio.nombre).replace(" ", "_").upper()

    # 2. ÍTEMS Y TOTALES
    items_tabla = []
    total_acumulado = 0
    items_query = proceso.detalles_items if hasattr(proceso, 'detalles_items') else proceso.details_items
    for item in items_query:
        items_tabla.append({
            'cant': int(item.cantidad) if item.cantidad % 1 == 0 else item.cantidad,
            'cod': str(item.codigo_clasificador or '').strip(),
            'desc': str(item.descripcion or '').strip(),
            'unit': f"{item.v_unitario:,.0f}",
            'total': f"{item.v_total:,.0f}"
        })
        total_acumulado += item.v_total

    # 3. TOTAL EN LETRAS
    try:
        total_letras_final = f"{num2words(total_acumulado, lang='es').upper()} PESOS M/L"
    except:
        total_letras_final = "ERROR EN CONVERSIÓN DE LETRAS"

    # 4. FORMATEAR NOMBRES CONTRATISTAS
    def format_p(p):
        if not p: return "", ""
        nombre = p.razon_social if (p.razon_social and not str(p.razon_social).isdigit()) else f"{p.primer_nombre or ''} {p.primer_apellido or ''}".strip()
        return nombre.upper(), p.documento

    n1, d1 = format_p(prov1)
    n2, d2 = format_p(prov2)
    n3, d3 = format_p(prov3)

    # --- NUEVA LÓGICA PARA CONTAR COTIZACIONES ---
    conteo_cotizaciones = 1  # La propuesta 1 siempre existe
    # Verificamos si la propuesta 2 tiene un valor real mayor a 0
    if proceso.valor_propuesta2 and proceso.valor_propuesta2 > 0:
        conteo_cotizaciones += 1
    # Verificamos si la propuesta 3 tiene un valor real mayor a 0
    if proceso.valor_propuesta3 and proceso.valor_propuesta3 > 0:
        conteo_cotizaciones += 1

    
   # 5. CONTEXTO FINAL (Dentro de obtener_contexto_proceso)
    contexto = {
        'col_nombre': colegio.nombre.upper(),
        'col_nit': colegio.nit,
        'col_rector': colegio.rector_nombre,
        'col_municipio': colegio.municipio,
        'col_direccion': colegio.direccion,
        'doc_rector': colegio.rector_documento,
        'vigencia': proceso.vigencia,
        'tipo_contrato': proceso.tipo_contrato,
        'objeto': proceso.objeto_desc,
        
        'contratista': n1, 'doc_contratista': d1,
        'contratista2': n2, 'doc_contratista2': d2,
        'contratista3': n3, 'doc_contratista3': d3,
        
        'cdp_numero': proceso.cdp_numero,
        'rubro': proceso.rubro_nombre,
        'cod_presupuestal': proceso.cod_presupuestal,
        
        # --- FECHAS SEGURAS (No rompen si son None) ---
        'f_elaboracion': proceso.f_elaboracion.strftime('%d/%m/%Y') if proceso.f_elaboracion else "",
        'f_publicacion': proceso.f_publicacion.strftime('%d/%m/%Y') if proceso.f_publicacion else "",
        'f_recepcion': proceso.f_recepcion.strftime('%d/%m/%Y') if proceso.f_recepcion else "",
        'f_cierre': proceso.f_cierre.strftime('%d/%m/%Y') if proceso.f_cierre else "",
        'f_verificacion': proceso.f_verificacion.strftime('%d/%m/%Y') if proceso.f_verificacion else "",
        'f_firma': proceso.f_firma.strftime('%d/%m/%Y') if proceso.f_firma else "",
        'f_recibido': proceso.f_recibido.strftime('%d/%m/%Y') if proceso.f_recibido else "",
        
        # --- TEXTOS LEGALES SEGUROS ---
        'f_elaboracion_texto': fecha_texto_largo(proceso.f_elaboracion),
        'f_elaboracion_legal': fecha_texto_legal(proceso.f_elaboracion),
        'f_publicacion_texto': fecha_texto_largo(proceso.f_publicacion),
        'f_publicacion_legal': fecha_texto_legal(proceso.f_publicacion),
        'f_recepcion_texto': fecha_texto_largo(proceso.f_recepcion),
        'f_recepcion_legal': fecha_texto_legal(proceso.f_recepcion),
        'f_cierre_texto': fecha_texto_largo(proceso.f_cierre),
        'f_cierre_legal': fecha_texto_legal(proceso.f_cierre),
        'f_verificacion_texto': fecha_texto_largo(proceso.f_verificacion),
        'f_verificacion_legal': fecha_texto_legal(proceso.f_verificacion),
        'f_firma_texto': fecha_texto_largo(proceso.f_firma),
        'f_firma_legal': fecha_texto_legal(proceso.f_firma),
        'f_recibido_texto': fecha_texto_largo(proceso.f_recibido), # Usamos largo para texto
        'f_recibido_legal': fecha_texto_legal(proceso.f_recibido),
        
        'plazo_txt': proceso.plazo_txt,
        'items': items_tabla,
        'total_final': f"${total_acumulado:,.0f}",
        'total_letras': total_letras_final,
        'promedio_valor': f"${proceso.promedio_propuestas:,.2f}",
        'cantidad_cotizaciones': conteo_cotizaciones,

        # --- VALORES DE PROPUESTA FORMATEADOS ---
        'valor_propuesta2': f"${proceso.valor_propuesta2:,.0f}" if proceso.valor_propuesta2 else "$ 0",
        'valor_propuesta3': f"${proceso.valor_propuesta3:,.0f}" if proceso.valor_propuesta3 else "$ 0",
    }
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
            for nombre_p in archivos_docs:
                doc = DocxTemplate(os.path.join(ruta_plantillas, nombre_p))
                
                # --- PROCESAR LOGO Y FIRMA ---
                if colegio.logo_path:
                    r_logo = os.path.join(current_app.root_path, 'static', 'uploads', colegio.logo_path)
                    if os.path.exists(r_logo):
                        contexto['logo'] = InlineImage(doc, r_logo, width=Mm(25))

                if colegio.firma_path:
                    r_firma = os.path.join(current_app.root_path, 'static', 'uploads', colegio.firma_path)
                    if os.path.exists(r_firma):
                        contexto['firma'] = InlineImage(doc, r_firma, width=Mm(45))

                doc.render(contexto)
                
                nombre_plantilla_limpio = os.path.splitext(nombre_p)[0].upper()
                nombre_base_final = f"{nombre_plantilla_limpio}_{nombre_col_limpio}"
                path_word = os.path.join(ruta_temp, f"{nombre_base_final}.docx")
                doc.save(path_word)
                
                if formato == 'pdf':
                    # BLOQUEO TAMBIÉN AQUÍ PARA EL ZIP
                    with pdf_lock:
                        try:
                            pythoncom.CoInitialize()
                            path_pdf = path_word.replace(".docx", ".pdf")
                            convert(path_word, path_pdf)
                            zf.write(path_pdf, arcname=f"{nombre_base_final}.pdf")
                            # Limpieza del PDF generado
                            if os.path.exists(path_pdf): os.remove(path_pdf)
                        except Exception as e:
                            print(f"Error PDF en ZIP: {e}")
                            zf.write(path_word, arcname=f"{nombre_base_final}.docx")
                else:
                    zf.write(path_word, arcname=f"{nombre_base_final}.docx")
                
                if os.path.exists(path_word):
                    os.remove(path_word)

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
        
        doc = DocxTemplate(os.path.join(ruta_plantillas, nombre_p))

        # --- PROCESAR LOGO Y FIRMA ---
        if colegio.logo_path:
            r_logo = os.path.join(current_app.root_path, 'static', 'uploads', colegio.logo_path)
            if os.path.exists(r_logo):
                contexto['logo'] = InlineImage(doc, r_logo, width=Mm(25))

        if colegio.firma_path:
            r_firma = os.path.join(current_app.root_path, 'static', 'uploads', colegio.firma_path)
            if os.path.exists(r_firma):
                contexto['firma'] = InlineImage(doc, r_firma, width=Mm(45))

        doc.render(contexto)
        
        nombre_plantilla_limpio = os.path.splitext(nombre_p)[0].upper()
        nombre_base_final = f"{nombre_plantilla_limpio}_{nombre_col_limpio}"
        
        ruta_temp = os.path.join(current_app.root_path, 'static', 'temp')
        os.makedirs(ruta_temp, exist_ok=True)
        
        path_word = os.path.join(ruta_temp, f"{nombre_base_final}.docx")
        doc.save(path_word)
        
        # --- LÓGICA DE ENVÍO ---
        archivo_a_enviar = path_word
        nombre_final_con_ext = f"{nombre_base_final}.docx"
        mimetype_final = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

        if formato == 'pdf':
            # PASO 3: Bloquear el acceso simultáneo a la conversión
            # Esto obliga a las peticiones a esperar su turno aquí
            with pdf_lock: 
                try:
                    pythoncom.CoInitialize()
                    path_pdf = path_word.replace(".docx", ".pdf")
                    convert(path_word, path_pdf)
                    archivo_a_enviar = path_pdf
                    nombre_final_con_ext = f"{nombre_base_final}.pdf"
                    mimetype_final = 'application/pdf'
                except Exception as e:
                    print(f"Error convirtiendo a PDF: {e}")
                finally:
                    # pythoncom.CoUninitialize() # Opcional, según tu versión de Windows
                    pass

        return send_file(
            archivo_a_enviar, 
            as_attachment=True, 
            download_name=nombre_final_con_ext,
            mimetype=mimetype_final
        )

    except Exception as e:
        print(f"ERROR EN DESCARGA: {str(e)}") 
        return f"Error: {str(e)}", 500