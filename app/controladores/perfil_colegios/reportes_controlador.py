from flask import Blueprint, request, current_app, send_file, jsonify
from app.modelos.models import ProcesoContractual, Colegio, Proveedor
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
import os, re, zipfile, subprocess  # <--- Agregamos subprocess para LibreOffice
from io import BytesIO
from num2words import num2words
import threading
from PIL import Image
import locale


pdf_lock = threading.Lock()
reportes_bp = Blueprint('reportes', __name__)

# --- NUEVA FUNCIÓN PARA ESTANDARIZAR TAMAÑOS (OPTIMIZADA PARA PRODUCCIÓN) ---
def redimensionar_imagen(ruta_img, ancho_max=400):
    """Crea una copia optimizada en temp para evitar bloquear el original"""
    if not ruta_img or not os.path.exists(ruta_img):
        return None
    try:
        # 1. Creamos un nombre único para la versión optimizada en la carpeta temp
        nombre_archivo = os.path.basename(ruta_img)
        ruta_temp_img = os.path.join(current_app.root_path, 'static', 'temp', f"opt_{nombre_archivo}")
        
        # Aseguramos que la carpeta temp exista
        os.makedirs(os.path.dirname(ruta_temp_img), exist_ok=True)

        with Image.open(ruta_img) as img:
            # 2. Solo redimensionamos si es necesario, pero SIEMPRE guardamos en temp
            # para que 'docxtpl' lea desde temp y no bloquee el original en uploads
            if img.width > ancho_max:
                ratio = ancho_max / float(img.width)
                alto = int(float(img.size[1]) * float(ratio))
                img = img.resize((ancho_max, alto), Image.Resampling.LANCZOS)
            
            # 3. Guardamos la copia en la ruta temporal
            img.save(ruta_temp_img, optimize=True, quality=90)
            return ruta_temp_img # Devolvemos la nueva ruta para usarla en el Word
            
    except Exception as e:
        print(f"Error redimensionando imagen: {e}")
        return ruta_img # Si falla, devolvemos la original para no romper el flujo

# --- 1. FUNCIONES DE FECHA (FUERA DE OTRAS FUNCIONES) ---
def fecha_texto_largo(fecha):
    # Verificación de seguridad: si no hay fecha o no tiene el atributo month
    if not fecha or not hasattr(fecha, 'month'): 
        return ""
    
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
             "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    return f"{fecha.day} de {meses[fecha.month - 1]} de {fecha.year}"

def fecha_texto_legal(fecha):
    # Verificación de seguridad
    if not fecha or not hasattr(fecha, 'month'): 
        return ""
    
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
             "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    
    dia_letras = "un" if fecha.day == 1 else num2words(fecha.day, lang='es').lower()
    anio_letras = num2words(fecha.year, lang='es').lower()
    
    return f"{dia_letras} ({fecha.day:02d}) días del mes de {meses[fecha.month - 1]} de {anio_letras} ({fecha.year})"


# --- 2. FUNCIÓN PRINCIPAL DEL CONTEXTO ---
def obtener_contexto_proceso(proceso_id):
    """Extrae datos y formatea fechas en estilo contractual largo"""
    proceso = ProcesoContractual.query.get_or_404(proceso_id)

    # DEBUG: Útil para ver en consola qué estamos procesando
    print(f"\n[SISTEMA] Generando contexto para Proceso ID: {proceso_id}")

    colegio = Colegio.query.get(proceso.colegio_id)
    
    # 1. IDENTIFICACIÓN DE PROVEEDORES
    prov1 = Proveedor.query.get(proceso.proveedor_id)
    prov2 = Proveedor.query.get(getattr(proceso, 'proveedor2_id', None))
    prov3 = Proveedor.query.get(getattr(proceso, 'proveedor3_id', None))

    # MEJORA: Nombre limpio más robusto para evitar errores en nombres de archivos ZIP
    nombre_col_limpio = re.sub(r'[^\w]', '_', colegio.nombre).replace("__", "_").upper()

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
    except Exception as e:
        print(f"Error en num2words: {e}")
        total_letras_final = "ERROR EN CONVERSIÓN DE LETRAS"

    # 4. FORMATEAR NOMBRES CONTRATISTAS
    def format_p(p):
        if not p: return "", ""
        
        # 1. Si existe razón social (y no es solo un número), la usamos directamente
        if p.razon_social and str(p.razon_social).strip() and not str(p.razon_social).isdigit():
            nombre_final = p.razon_social
        else:
            # 2. Si es persona natural, unimos los 4 campos de nombre de forma limpia
            # Usamos filter(None, ...) para que si un campo es vacío no genere espacios dobles
            nombres = [
                p.primer_nombre, 
                p.segundo_nombre, 
                p.primer_apellido, 
                p.segundo_apellido
            ]
            # Limpiamos cada parte y quitamos los que sean None o estén vacíos
            partes_limpias = [str(n).strip() for n in nombres if n and str(n).strip()]
            nombre_final = " ".join(partes_limpias)
        
        return nombre_final.upper().strip(), p.documento

    # El resto del código sigue igual, llamando a la función:
    n1, d1 = format_p(prov1)
    n2, d2 = format_p(prov2)
    n3, d3 = format_p(prov3)

    # --- LÓGICA DE CONTEO DE COTIZACIONES ---
    conteo_cotizaciones = 1
    if proceso.valor_propuesta2 and proceso.valor_propuesta2 > 0:
        conteo_cotizaciones += 1
    if proceso.valor_propuesta3 and proceso.valor_propuesta3 > 0:
        conteo_cotizaciones += 1
    
    # Convertimos a entero por seguridad si viene como string
    anio_base = int(proceso.vigencia) if proceso.vigencia else datetime.now().year
    
    # 5. CONTEXTO FINAL
    contexto = {
        'col_nombre': colegio.nombre.upper(),
        'col_nit': colegio.nit,
        'col_rector': colegio.rector_nombre,
        'col_municipio': colegio.municipio,
        'col_direccion': colegio.direccion,
        'doc_rector': colegio.rector_documento,
        'vigencia': anio_base,
        'ano_anterior': anio_base - 1,      # Ejemplo: 2024 -> 2023
        'dos_anos_antes': anio_base - 2,    # Ejemplo: 2024 -> 2022
        'tipo_contrato': proceso.tipo_contrato,
        'objeto': proceso.objeto_desc,
        
        'contratista': n1, 'doc_contratista': d1,
        'contratista2': n2, 'doc_contratista2': d2,
        'contratista3': n3, 'doc_contratista3': d3,
        
        'cdp_numero': proceso.cdp_numero,
        'rubro': proceso.rubro_nombre,
        'cod_presupuestal': proceso.cod_presupuestal,
        
        # Fechas en formato corto DD/MM/AAAA
        'f_elaboracion': proceso.f_elaboracion.strftime('%d/%m/%Y') if proceso.f_elaboracion else "",
        'f_publicacion': proceso.f_publicacion.strftime('%d/%m/%Y') if proceso.f_publicacion else "",
        'f_recepcion': proceso.f_recepcion.strftime('%d/%m/%Y') if proceso.f_recepcion else "",
        'f_cierre': proceso.f_cierre.strftime('%d/%m/%Y') if proceso.f_cierre else "",
        'f_verificacion': proceso.f_verificacion.strftime('%d/%m/%Y') if proceso.f_verificacion else "",
        'f_firma': proceso.f_firma.strftime('%d/%m/%Y') if proceso.f_firma else "",
        'f_recibido': proceso.f_recibido.strftime('%d/%m/%Y') if proceso.f_recibido else "",
        
        # Textos legales usando tus funciones (ya validadas)
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
        'f_recibido_texto': fecha_texto_largo(proceso.f_recibido),
        'f_recibido_legal': fecha_texto_legal(proceso.f_recibido),
        
        'plazo_txt': proceso.plazo_txt,
        'items': items_tabla,
        'total_final': f"${total_acumulado:,.0f}",
        'total_letras': total_letras_final,
        'promedio_valor': f"${proceso.promedio_propuestas:,.0f}",
        'cantidad_cotizaciones': conteo_cotizaciones,

        'valor_propuesta2': f"${proceso.valor_propuesta2:,.0f}" if proceso.valor_propuesta2 else "$ 0",
        'valor_propuesta3': f"${proceso.valor_propuesta3:,.0f}" if proceso.valor_propuesta3 else "$ 0",
    }
    return contexto, colegio, nombre_col_limpio

@reportes_bp.route('/obtener_lista_plantillas')
def lista_plantillas():
    ruta = os.path.join(current_app.root_path, 'static', 'plantillas')
    
    # MEJORA: Verificar si la ruta existe para evitar que la app explote
    if not os.path.exists(ruta):
        print(f"[ERROR] La carpeta de plantillas no existe en: {ruta}")
        return jsonify([]) # Devolvemos lista vacía si no hay carpeta

    # Mantenemos tu lógica original de filtrado y ordenado
    archivos = sorted([f for f in os.listdir(ruta) if f.endswith('.docx')])
    return jsonify(archivos)


def convertir_a_pdf_libreoffice(ruta_docx, carpeta_destino):
    """Usa LibreOffice para convertir de forma industrial"""
    # Ruta al ejecutable que verificamos
    libreoffice_exe = r"C:\Program Files\LibreOffice\program\soffice.exe"
    
    comando = [
        libreoffice_exe,
        '--headless',                 # No abre la ventana de la app
        '--convert-to', 'pdf',        # Formato de salida
        '--outdir', carpeta_destino,  # Donde guardar el PDF
        ruta_docx                     # Archivo a convertir
    ]
    
    try:
        # Ejecutamos el comando con un tiempo límite de 30 segundos
        subprocess.run(comando, check=True, timeout=30, capture_output=True)
        return True
    except Exception as e:
        print(f"Error en conversión LibreOffice: {e}")
        return False

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
                
                # --- PROCESAR LOGO (Con nueva función de ruta temporal) ---
        
                if colegio.logo_path:
                    r_logo_orig = os.path.join(current_app.root_path, 'static', 'uploads', colegio.logo_path)
                    r_logo_opt = redimensionar_imagen(r_logo_orig, ancho_max=300)
                    if r_logo_opt:
                    # Tamaño reducido a 20mm para que no descuadre la cabecera
                        contexto['logo'] = InlineImage(doc, r_logo_opt, width=Mm(20))

                # --- PROCESAR FIRMA ---
                if colegio.firma_path:
                    r_firma_orig = os.path.join(current_app.root_path, 'static', 'uploads', colegio.firma_path)
                    r_firma_opt = redimensionar_imagen(r_firma_orig, ancho_max=450)
                    if r_firma_opt:
                    # Tamaño reducido a 35mm para que se vea elegante
                        contexto['firma'] = InlineImage(doc, r_firma_opt, width=Mm(35))

                doc.render(contexto)
                
                nombre_plantilla_limpio = os.path.splitext(nombre_p)[0].upper()
                nombre_base_final = f"{nombre_plantilla_limpio}_{nombre_col_limpio}"
                path_word = os.path.join(ruta_temp, f"{nombre_base_final}.docx")
                doc.save(path_word)
                
                if formato == 'pdf':
                    # Usamos el Lock para que LibreOffice no se sature procesando 10 archivos a la vez
                    with pdf_lock:
                        exito = convertir_a_pdf_libreoffice(path_word, ruta_temp)
                        if exito:
                            path_pdf = path_word.replace(".docx", ".pdf")
                            zf.write(path_pdf, arcname=f"{nombre_base_final}.pdf")
                            # Limpieza inmediata del PDF temporal
                            if os.path.exists(path_pdf): os.remove(path_pdf)
                        else:
                            # Si falla el PDF, enviamos el Word para no dejar al usuario sin nada
                            zf.write(path_word, arcname=f"{nombre_base_final}.docx")
                else:
                    zf.write(path_word, arcname=f"{nombre_base_final}.docx")
                
                # Limpieza del Word temporal
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

        # --- PROCESAR LOGO (Nueva lógica optimizada) ---
        if colegio.logo_path:
            r_logo_orig = os.path.join(current_app.root_path, 'static', 'uploads', colegio.logo_path)
            # Usamos la nueva función que guarda en temp y devuelve la ruta
            r_logo_opt = redimensionar_imagen(r_logo_orig, ancho_max=300)
            if r_logo_opt:
                contexto['logo'] = InlineImage(doc, r_logo_opt, width=Mm(28))

        # --- PROCESAR FIRMA (Nueva lógica optimizada) ---
        if colegio.firma_path:
            r_firma_orig = os.path.join(current_app.root_path, 'static', 'uploads', colegio.firma_path)
            r_firma_opt = redimensionar_imagen(r_firma_orig, ancho_max=450)
            if r_firma_opt:
                contexto['firma'] = InlineImage(doc, r_firma_opt, width=Mm(25))

        doc.render(contexto)
        
        nombre_plantilla_limpio = os.path.splitext(nombre_p)[0].upper()
        nombre_base_final = f"{nombre_plantilla_limpio}_{nombre_col_limpio}"
        
        ruta_temp = os.path.join(current_app.root_path, 'static', 'temp')
        os.makedirs(ruta_temp, exist_ok=True)
        
        path_word = os.path.join(ruta_temp, f"{nombre_base_final}.docx")
        doc.save(path_word)
        
        # --- LÓGICA DE ENVÍO Y CONVERSIÓN ---
        archivo_a_enviar = path_word
        nombre_final_con_ext = f"{nombre_base_final}.docx"
        mimetype_final = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

        if formato == 'pdf':
            # Reemplazamos pythoncom y docx2pdf por nuestro nuevo motor LibreOffice
            with pdf_lock: 
                exito = convertir_a_pdf_libreoffice(path_word, ruta_temp)
                if exito:
                    path_pdf = path_word.replace(".docx", ".pdf")
                    archivo_a_enviar = path_pdf
                    nombre_final_con_ext = f"{nombre_base_final}.pdf"
                    mimetype_final = 'application/pdf'
                    # Opcional: eliminar el word si se generó el PDF con éxito
                    if os.path.exists(path_word): os.remove(path_word)
                else:
                    print("Fallo la conversión individual, enviando Word de respaldo.")

        return send_file(
            archivo_a_enviar, 
            as_attachment=True, 
            download_name=nombre_final_con_ext,
            mimetype=mimetype_final
        )

    except Exception as e:
        print(f"ERROR EN DESCARGA INDIVIDUAL: {str(e)}") 
        return f"Error: {str(e)}", 500