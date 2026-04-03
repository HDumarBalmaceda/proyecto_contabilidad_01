from flask import Blueprint, request, send_file, jsonify, current_app
from flask_login import login_required, current_user
from app.modelos.models import ProcesoContractual, Colegio # Verifica que la ruta de importación sea correcta
from app import db
import os
from io import BytesIO
from datetime import datetime
from openpyxl import load_workbook
import traceback
from openpyxl.drawing.image import Image as OpenpyxlImage
from openpyxl.styles import Border, Side, Alignment

reportes_bp = Blueprint('reportes_excel', __name__)

def obtener_nombre_mes(fecha_str):
    if not fecha_str:
        return ""
    meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]
    try:
        # Convertimos la cadena '2026-03-28' a objeto datetime
        fecha_dt = datetime.strptime(fecha_str, '%Y-%m-%d')
        return meses[fecha_dt.month - 1].upper()
    except:
        return ""

def obtener_anio(fecha_str):
    if not fecha_str:
        return ""
    try:
        fecha_dt = datetime.strptime(fecha_str, '%Y-%m-%d')
        return str(fecha_dt.year)
    except:
        return ""

@reportes_bp.route('/exportar-excel-procesos')
@login_required
def exportar_excel_procesos():
    try:
        # 1. Capturar Parámetros
        colegio_id_raw = request.args.get('colegio_id')
        fecha_inicio = request.args.get('inicio')
        fecha_fin = request.args.get('fin')
        
        if not colegio_id_raw or colegio_id_raw == 'undefined':
            return jsonify({"status": "error", "message": "ID no válido"}), 400

        colegio = Colegio.query.get(int(colegio_id_raw))
        if not colegio:
            return jsonify({"status": "error", "message": "El colegio no existe."}), 404

        # --- LÓGICA DE FECHAS ---
        nombre_mes_inicio = obtener_nombre_mes(fecha_inicio) if fecha_inicio else "N/A"
        nombre_mes_fin = obtener_nombre_mes(fecha_fin) if fecha_fin else "N/A"
        anio_rendicion = obtener_anio(fecha_fin) if fecha_fin else datetime.now().strftime('%Y')

        # 2. CONSULTA DE PROCESOS
        query = ProcesoContractual.query.filter(ProcesoContractual.colegio_id == colegio.id)
        if fecha_inicio:
            query = query.filter(db.func.date(ProcesoContractual.fecha_creacion) >= fecha_inicio)
        if fecha_fin:
            query = query.filter(db.func.date(ProcesoContractual.fecha_creacion) <= fecha_fin)
        
        procesos = query.all()
        if not procesos:
            return jsonify({"status": "info", "message": "No hay procesos con estos filtros."}), 404

        # 3. CARGA DE PLANTILLA
        ruta_plantilla = os.path.join(current_app.root_path, 'static', 'reportes_excel', 'FORMATOS_INFORMACION.xlsx')
        wb = load_workbook(ruta_plantilla)
        ws = wb['CDA15'] if 'CDA15' in wb.sheetnames else wb.active
        ws2 = wb['CDA13'] if 'CDA13' in wb.sheetnames else ws

        border_thin = Border(left=Side(style='thin'), right=Side(style='thin'), 
                            top=Side(style='thin'), bottom=Side(style='thin'))

        # 4. LLENADO DE DATOS (FILAS SEPARADAS)
        fila_inicio_cda15 = 14
        fila_inicio_cda13 = 9  # <--- Cambio solicitado

        for i, p in enumerate(procesos):
            f15 = fila_inicio_cda15 + i
            f13 = fila_inicio_cda13 + i
            
            # Lógica de proveedor
            nombre_p = "SIN NOMBRE"
            doc_p = ""
            if p.proveedor:
                doc_p = p.proveedor.documento
                nom_comp = f"{p.proveedor.primer_nombre or ''} {p.proveedor.segundo_nombre or ''} {p.proveedor.primer_apellido or ''} {p.proveedor.segundo_apellido or ''}"
                nombre_p = " ".join(nom_comp.split()).strip().upper() or (p.proveedor.razon_social or "SIN NOMBRE").upper()

            # --- LLENADO HOJA 1 (CDA15) ---
            if i > 0: ws.insert_rows(f15)
            ws.cell(row=f15, column=1).value = p.numero_proceso_colegio
            ws.cell(row=f15, column=2).value = p.objeto_desc
            ws.cell(row=f15, column=3).value = p.gran_total
            ws.cell(row=f15, column=4).value = nombre_p
            ws.cell(row=f15, column=5).value = doc_p
            ws.cell(row=f15, column=6).value = p.cdp_numero
            ws.cell(row=f15, column=8).value = p.tipo_contrato
            
            for c in [1, 2, 3, 4, 5, 6, 8]:
                ws.cell(row=f15, column=c).border = border_thin
                ws.cell(row=f15, column=c).alignment = Alignment(wrap_text=True, vertical='center')

            # --- LLENADO HOJA 2 (CDA13) ---
            if i > 0: ws2.insert_rows(f13)
            # Lado Izquierdo (A - O)
            ws2.cell(row=f13, column=1).value = p.numero_proceso_colegio
            ws2.cell(row=f13, column=2).value = p.objeto_desc
            ws2.cell(row=f13, column=4).value = p.gran_total
            ws2.cell(row=f13, column=8).value = p.tipo_contrato
            ws2.cell(row=f13, column=14).value = nombre_p
            ws2.cell(row=f13, column=15).value = doc_p
            
            # Columnas adicionales CDA13
            ws2.cell(row=f13, column=19).value = p.cdp_numero
            ws2.cell(row=f13, column=33).value = (p.rubro_nombre or "").upper()
            if p.fecha_creacion:
                ws2.cell(row=f13, column=20).value = p.fecha_creacion.strftime('%d/%m/%Y')

            # Aplicar bordes CDA13
            for c in [1, 2, 4, 8, 14, 15, 19, 20, 33]:
                ws2.cell(row=f13, column=c).border = border_thin
                ws2.cell(row=f13, column=c).alignment = Alignment(wrap_text=True, vertical='center')

        # 5. SECCIÓN DE FIRMA Y ENCABEZADOS
        final_f15 = fila_inicio_cda15 + len(procesos) + 2
        final_f13 = fila_inicio_cda13 + len(procesos) + 2
        
        # --- ENCABEZADOS HOJA 1 (CDA15) ---
        # Mantenemos los que ya tenías que funcionan bien
        ws['B8'] = colegio.nombre.upper()
        ws['H8'] = f"NIT: {colegio.nit}"
        ws['M9'] = f"PERIODO: {anio_rendicion}"
        ws['K10'] = f"MES INICIO: {nombre_mes_inicio}"
        ws['N10'] = f"MES FIN: {nombre_mes_fin}"

        # --- ENCABEZADOS HOJA 2 (CDA13) - MODO GENÉRICO ---
        # Usamos columnas fijas a la izquierda (A, B) para evitar combinaciones en el centro (K, L, M)
        # Esto evitará el error de 'MergedCell' mientras verificas tu plantilla.
        
        ws2['A1'] = "REPORTE DE PROCESOS CONTRACTUALES" # Un título genérico arriba
        ws2['A2'] = f"INSTITUCIÓN: {colegio.nombre.upper()}"
        ws2['A3'] = f"NIT: {colegio.nit}"
        
        # Para los datos de fechas, los ponemos en columnas que suelen estar libres
        ws2['A5'] = f"AÑO: {anio_rendicion}"
        ws2['C5'] = f"DESDE: {nombre_mes_inicio}"
        ws2['E5'] = f"HASTA: {nombre_mes_fin}"

        # --- FUNCIÓN DE SEGURIDAD (Por si acaso quieres intentar en celdas específicas) ---
        def escribir_en_celda(sheet, coord, valor):
            try:
                sheet[coord] = valor
            except Exception:
                # Si falla por estar combinada, no hace nada y evita que el programa se caiga
                pass

        # Si luego confirmas que quieres intentar en K7, lo haces así:
        # escribir_en_celda(ws2, 'K7', f"INICIO: {nombre_mes_inicio}")

        # --- LLAMADAS A LA FUNCIÓN DE FIRMA ---
        insertar_firma_colegio(ws, colegio, final_f15)
        insertar_firma_colegio(ws2, colegio, final_f13)

        # 6. GENERAR DESCARGA
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        nombre_file = f"REPORTE_{colegio.nombre[:15]}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                         as_attachment=True, download_name=nombre_file)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500
    
    
def insertar_firma_colegio(sheet, colegio, fila_inicio_firma):
    from openpyxl.styles import Font
    from openpyxl.drawing.image import Image as OpenpyxlImage
    
    # Detectamos si es la hoja CDA13 para aplicar la repetición
    es_cda15 = (sheet.title == 'CDA15')
    
    # Definimos los desplazamientos (Offsets)
    # El primer bloque empieza en columna 1 (A). 
    # El segundo bloque (si es CDA13) empieza en la columna 19 (S)
    puntos_inicio = [1] 
    if es_cda15:
        puntos_inicio.append(19) # Añadimos la columna S para la segunda tabla

    font_bold = Font(bold=True)
    linea_larga = "____________________________________"
    linea_corta = "__________________"

    for inicio_col in puntos_inicio:
        # Calculamos columnas relativas al inicio de cada tabla
        col_rep = inicio_col      # Representante
        col_adm = inicio_col + 7  # Director Admin
        col_jur = inicio_col + 13 # Jurídica

        # --- 1. LÍNEAS DE FIRMA ---
        sheet.cell(row=fila_inicio_firma, column=col_rep).value = linea_larga
        sheet.cell(row=fila_inicio_firma, column=col_adm).value = linea_larga
        sheet.cell(row=fila_inicio_firma, column=col_jur).value = linea_corta

        # --- 2. CARGOS Y NOMBRES ---
        # Representante Legal
        nombre_rector = (colegio.rector_nombre or "REPRESENTANTE LEGAL").upper()
        sheet.cell(row=fila_inicio_firma + 1, column=col_rep).value = nombre_rector
        sheet.cell(row=fila_inicio_firma + 2, column=col_rep).value = "FIRMA REPRESENTANTE LEGAL"
        sheet.cell(row=fila_inicio_firma + 2, column=col_rep).font = font_bold

        # Director Administrativo
        sheet.cell(row=fila_inicio_firma + 2, column=col_adm).value = "FIRMA DIRECTOR ADMINISTRATIVO"
        sheet.cell(row=fila_inicio_firma + 2, column=col_adm).font = font_bold

        # Oficina Jurídica
        sheet.cell(row=fila_inicio_firma + 1, column=col_jur).value = "FIRMA OFICINA"
        sheet.cell(row=fila_inicio_firma + 2, column=col_jur).value = "JURIDICA"
        sheet.cell(row=fila_inicio_firma + 1, column=col_jur).font = font_bold
        sheet.cell(row=fila_inicio_firma + 2, column=col_jur).font = font_bold

        # --- 3. IMAGEN DE FIRMA ---
        if colegio.firma_path:
            nombre_firma = os.path.basename(colegio.firma_path)
            ruta_f = os.path.join(current_app.root_path, 'static', 'uploads', nombre_firma)
            
            if os.path.exists(ruta_f):
                try:
                    img = OpenpyxlImage(ruta_f)
                    img.width, img.height = 130, 50
                    
                    # Convertimos el número de columna a letra para openpyxl
                    # inicio_col 1 -> 'A', inicio_col 19 -> 'S'
                    from openpyxl.utils import get_column_letter
                    letra_col = get_column_letter(col_rep)
                    
                    sheet.add_image(img, f'{letra_col}{fila_inicio_firma - 3}')
                except Exception as e:
                    print(f"Error imagen: {e}")