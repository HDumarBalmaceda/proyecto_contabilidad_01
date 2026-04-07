import os
import subprocess
import tempfile
import traceback
import platform
import re  # Para limpiar el nombre del archivo
import io
import shutil
from flask import Blueprint, request, send_file, current_app, jsonify
from docxtpl import DocxTemplate, InlineImage
from app.modelos.models import Colegio, ProcesoContractual
from datetime import datetime
from docx.shared import Mm 
from flask_login import current_user, login_required

reportes_pdf_bp = Blueprint('reportes_pdf', __name__)

@reportes_pdf_bp.route('/exportar-pdf-procesos')
@login_required # <--- IMPORTANTE: Asegura que haya un usuario logueado
def exportar_pdf_procesos():
    try:
        # --- 1. CAPTURA DE PARÁMETROS ---
        colegio_id = request.args.get('colegio_id')
        f_inicio_str = request.args.get('inicio')
        f_fin_str = request.args.get('fin')
        tipo_contrato = request.args.get('tipo')
        rubro = request.args.get('rubro')

        if not colegio_id or not f_inicio_str or not f_fin_str:
            return jsonify({"message": "Faltan datos obligatorios"}), 400

        # --- 2. CONSULTA Y VALIDACIÓN DE SEGURIDAD ---
        colegio = Colegio.query.get_or_404(colegio_id)
        
        # VERIFICACIÓN: ¿Es admin o es el dueño del colegio?
        # Ajusta 'admin' según cómo nombres el rol en tu modelo de Usuario
        es_admin = getattr(current_user, 'rol', '') == 'admin' 
        es_dueno = colegio.usuario_id == current_user.id

        if not (es_admin or es_dueno):
            print(f"INTENTO DE ACCESO NO AUTORIZADO: Usuario {current_user.id} trató de acceder al Colegio {colegio_id}")
            return jsonify({"message": "No tienes permiso para acceder a los reportes de este colegio."}), 403

        # --- 3. CONTINUACIÓN DE LA CONSULTA DE PROCESOS ---
        query = ProcesoContractual.query.filter(
            ProcesoContractual.colegio_id == colegio_id,
            ProcesoContractual.fecha_creacion >= f_inicio_str,
            ProcesoContractual.fecha_creacion <= f_fin_str + " 23:59:59"
        )

        if tipo_contrato and tipo_contrato.strip() != "":
            query = query.filter(ProcesoContractual.tipo_contrato == tipo_contrato)
        
        if rubro and rubro.strip() != "":
            query = query.filter(ProcesoContractual.cod_presupuestal == rubro)

        procesos_db = query.order_by(ProcesoContractual.numero_proceso_colegio.asc()).all()

        if not procesos_db:
            return jsonify({"message": "No hay procesos para estos filtros."}), 404

        # --- 3. RUTA DE PLANTILLA ---
        path_plantilla = os.path.join(current_app.root_path, 'static', 'reportes', 'plantilla_reportes.docx')
        
        if not os.path.exists(path_plantilla):
            return jsonify({"message": "No se encontró la plantilla de reporte."}), 500

        # --- 4. PREPARACIÓN DE DATOS Y RENDERIZADO ---
        doc = DocxTemplate(path_plantilla)
        
        procesos_plantilla = []
        total_acumulado = 0  # <--- VARIABLE PARA EL TOTAL

        for p in procesos_db:
            # Sumamos al total (aseguramos que sea 0 si es None)
            total_acumulado += (p.gran_total or 0)

            nom_prov = p.proveedor.razon_social if p.proveedor.razon_social else f"{p.proveedor.primer_nombre} {p.proveedor.primer_apellido}"
            procesos_plantilla.append({
                'num': p.numero_proceso_colegio,
                'objeto': p.objeto_desc,
                'proveedor': nom_prov,
                'valor': f"${p.gran_total:,.0f}".replace(',', '.'),
                'cdp': p.cdp_numero,
                'rubro': p.cod_presupuestal,
                'link': p.link_secop if p.link_secop else "N/A",
                'contrato': p.tipo_contrato,
                'nom_rubro': p.rubro_nombre
            })

        # Formateamos el total general
        total_general_str = f"${total_acumulado:,.0f}".replace(',', '.')

        # --- FORMATEO DE FECHAS ---
        try:
            f_inicio_reporte = datetime.strptime(f_inicio_str, '%Y-%m-%d').strftime('%d/%m/%Y')
            f_fin_reporte = datetime.strptime(f_fin_str, '%Y-%m-%d').strftime('%d/%m/%Y')
        except:
            f_inicio_reporte = f_inicio_str
            f_fin_reporte = f_fin_str

        # --- LÓGICA PARA IMÁGENES (LOGO Y FIRMA) ---
        from PIL import Image
        import io

        # Función interna para procesar imágenes con el mismo filtro de seguridad
        def preparar_imagen(path_relativo, ancho_mm):
            if not path_relativo:
                return ""
            try:
                nombre_img = path_relativo.lstrip('/')
                full_path = os.path.join(current_app.root_path, 'static', 'uploads', nombre_img)
                
                if os.path.exists(full_path):
                    with Image.open(full_path) as img:
                        # Convertimos a RGB para evitar errores de CMYK o Transparencias
                        if img.mode in ("RGBA", "P", "CMYK"):
                            img = img.convert("RGB")
                        
                        image_stream = io.BytesIO()
                        img.save(image_stream, format='PNG')
                        image_stream.seek(0)
                        
                        return InlineImage(doc, image_stream, width=Mm(ancho_mm))
                return ""
            except Exception as e:
                print(f"Error procesando imagen {path_relativo}: {e}")
                return ""

        # Procesamos ambas imágenes
        logo_image = preparar_imagen(colegio.logo_path, 30)
        firma_image = preparar_imagen(colegio.firma_path, 50) # Firma un poco más grande

        # --- CONTEXTO ACTUALIZADO ---
        contexto = {
            'nombre_colegio': colegio.nombre.upper(),
            'nit_colegio': colegio.nit,
            'logo': logo_image,
            'firma': firma_image,  # <--- Nueva variable
            'rector': (colegio.rector_nombre or "").upper(), # <--- Según tu modelo
            'documento_rector': f"{colegio.rector_tipo_documento} {colegio.rector_documento}", # <--- Para el pie de firma
            'fecha_reporte': datetime.now().strftime('%d/%m/%Y'),
            'inicio': f_inicio_reporte,
            'fin': f_fin_reporte,
            'procesos': procesos_plantilla,
            'total_general': total_general_str,
            'municipio': colegio.municipio
        }

        # Renderizado
        doc.render(contexto)

        # --- 5. GENERACIÓN DE PDF Y MANEJO DE TEMPORALES ---
        tmpdir = tempfile.mkdtemp() 
        try:
            word_temp_path = os.path.join(tmpdir, "output.docx")
            doc.save(word_temp_path)

            if platform.system() == "Windows":
                comando_libreoffice = r'C:\Program Files\LibreOffice\program\soffice.exe'
            else:
                comando_libreoffice = 'libreoffice'

            subprocess.run([
                comando_libreoffice, '--headless', '--convert-to', 'pdf',
                '--outdir', tmpdir, word_temp_path
            ], capture_output=True, text=True, check=True)

            pdf_temp_path = os.path.join(tmpdir, "output.pdf")
            
            if not os.path.exists(pdf_temp_path):
                return jsonify({"message": "Error al convertir el documento a PDF."}), 500

            nombre_limpio = re.sub(r'[^a-zA-Z0-9]', '_', colegio.nombre.upper())
            nombre_descarga = f"REPORTE_PROCESOS_{nombre_limpio}.pdf"

            with open(pdf_temp_path, 'rb') as f:
                pdf_data = f.read()

            return send_file(
                io.BytesIO(pdf_data),
                as_attachment=True,
                download_name=nombre_descarga,
                mimetype='application/pdf'
            )

        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    except Exception as e:
        print("Error en exportar_pdf_procesos:")
        print(traceback.format_exc())
        return jsonify({"message": f"Error técnico: {str(e)}"}), 500