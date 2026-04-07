/**
 * ABRE EL MODAL DE FILTROS PARA PDF
 */
function abrirModalFiltrosPDF() {
    // 1. Buscamos el elemento con el nuevo ID
    const modalElement = document.getElementById('modalFiltrosPDF');
    
    if (!modalElement) {
        console.error("Error: No se encontró el modal con ID 'modalFiltrosPDF'.");
        Swal.fire('Error', 'No se encontró el formulario de filtros PDF', 'error');
        return;
    }

    // 2. Mostramos el modal
    const modalFiltros = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalFiltros.show();
}

/**
 * EJECUTA LA PETICIÓN AL BACKEND PARA GENERAR EL PDF
 */
async function ejecutarDescargaPDF() {
    let colegioId = obtenerColegioId();

    if (!colegioId) {
        Swal.fire('Error', 'No se pudo determinar el ID del colegio.', 'error');
        return;
    }

    const fInicio = document.getElementById('fechaInicioPDF').value;
    const fFin = document.getElementById('fechaFinPDF').value;
    const tContrato = document.getElementById('tipoContratoPDF').value;
    const rubroSel = document.getElementById('rubroPDF').value;

    if (!fInicio || !fFin) {
        Swal.fire('Atención', 'Por favor selecciona el rango de fechas para el reporte.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Generando Reporte PDF...',
        text: 'Esto puede tardar unos segundos dependiendo del volumen de datos.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const params = new URLSearchParams({
            colegio_id: colegioId,
            inicio: fInicio,
            fin: fFin,
            tipo: tContrato,
            rubro: rubroSel 
        }).toString();

        const urlDescarga = `/reportes/exportar-pdf-procesos?${params}`;
        
        const response = await fetch(urlDescarga);

        if (response.ok) {
            const contentType = response.headers.get('Content-Type');
            
            if (contentType && contentType.includes('pdf')) {
                const blob = await response.blob();
                
                // 1. EXTRAER EL NOMBRE DEL ARCHIVO DESDE LOS HEADERS DEL SERVIDOR
                const disposition = response.headers.get('Content-Disposition');
                let fileName = `Reporte_Procesos_${fInicio}_al_${fFin}.pdf`; // Nombre de respaldo

                if (disposition && disposition.includes('attachment')) {
                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) { 
                        // Quitamos comillas si el nombre las trae
                        fileName = matches[1].replace(/['"]/g, '');
                    }
                }

                // 2. CREAR EL LINK INVISIBLE Y DISPARAR DESCARGA
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName; // <--- Ahora sí usará REPORTE_PROCESOS_NOMBRE_COLEGIO.pdf
                document.body.appendChild(a);
                a.click();
                
                // 3. LIMPIEZA
                window.URL.revokeObjectURL(url);
                a.remove();

                // Feedback de éxito
                Swal.fire({
                    icon: 'success',
                    title: '¡Reporte Generado!',
                    text: `Archivo: ${fileName}`,
                    timer: 2000,
                    showConfirmButton: false
                });
                
                // CERRAMOS EL MODAL
                // Al ejecutarse esto, se dispara automáticamente el 'hidden.bs.modal' que pusimos arriba
                const modalElement = document.getElementById('modalFiltrosPDF');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    modalInstance.hide();
                }
            
            } else {
                const data = await response.json();
                Swal.fire('Sin registros', data.message || 'No se encontraron procesos.', 'info');
            }
        } else {
            const data = await response.json().catch(() => ({}));
            Swal.fire('Error', data.message || 'Error en el servidor.', 'error');
        }
    } catch (error) {
        console.error("Error en generación PDF:", error);
        Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
    }
}

/**
 * Escuchador para limpiar los filtros cada vez que el modal se cierre
 */
document.addEventListener('DOMContentLoaded', () => {
    const modalPDF = document.getElementById('modalFiltrosPDF');
    if (modalPDF) {
        modalPDF.addEventListener('hidden.bs.modal', function () {
            // Limpia los inputs de fecha
            document.getElementById('fechaInicioPDF').value = "";
            document.getElementById('fechaFinPDF').value = "";
            
            // Regresa los selects a la primera opción ("Todos" o vacío)
            document.getElementById('tipoContratoPDF').selectedIndex = 0;
            document.getElementById('rubroPDF').selectedIndex = 0;
            
            console.log("Formulario de PDF reseteado correctamente.");
        });
    }
});