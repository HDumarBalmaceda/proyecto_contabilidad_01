/**
 * exportar_documentos.js
 * Maneja la interfaz de SweetAlert2 para elegir formato y modo.
 */

function abrirOpcionesDescarga(datosParaEnviar, colegioId) {
    Swal.fire({
        title: 'Finalizar Expediente',
        html: `
            <div class="text-start mt-2">
                <label class="form-label fw-bold small">1. Seleccione Formato</label>
                <select id="swal-formato" class="form-select mb-3">
                    <option value="pdf">Documento PDF (.pdf)</option>
                    <option value="word">Microsoft Word (.docx)</option>
                </select>

                <label class="form-label fw-bold small">2. Seleccione Modo</label>
                <select id="swal-modo" class="form-select">
                    <option value="solo">Descargar independientemente</option>
                    <option value="zip">Paquete Completo (ZIP)</option>
                </select>
            </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Generar y Descargar',
        confirmButtonColor: '#198754',
        preConfirm: () => {
            return {
                formato: document.getElementById('swal-formato').value,
                modo: document.getElementById('swal-modo').value
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            ejecutarEnvioFinal(datosParaEnviar, colegioId, result.value);
        }
    });
}

async function ejecutarEnvioFinal(datos, colegioId, opciones) {
    // 1. Mostrar carga inmediatamente
    Swal.fire({
        title: 'Generando Documentos...',
        text: 'Estamos preparando tus archivos. Por favor, no cierres esta ventana.',
        allowOutsideClick: false,
        didOpen: () => { 
            Swal.showLoading(); 
        }
    });

    try {
        const response = await fetch(`/procesos/guardar_proceso/${colegioId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        // 2. Si hay error 500, intentar leer el mensaje del servidor
        if (!response.ok) {
            const errorMsg = await response.text();
            console.error("Error del servidor:", errorMsg);
            throw new Error(`Error en el servidor (${response.status})`);
        }

        const resultado = await response.json();

        if (resultado.status === 'success' || resultado.success) {
            // Soporte para diferentes nombres de ID que envíe el backend
            const idReal = resultado.proceso_id || resultado.id; 
            
            // Cerrar el modal principal si está abierto (para que no estorbe al terminar)
            const modalElement = document.getElementById('modalGeneradorDocs');
            const modalBS = bootstrap.Modal.getInstance(modalElement);
            if (modalBS) modalBS.hide();

            const descargarArchivo = (url, nombreSugerido) => {
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', nombreSugerido);
                link.setAttribute('target', '_blank'); // Seguridad extra para navegadores
                document.body.appendChild(link);
                link.click();
                link.remove();
            };

            // 3. Lógica de descarga según el modo seleccionado
            if (opciones.modo === 'zip') {
                descargarArchivo(`/reportes/descargar_zip/${idReal}?formato=${opciones.formato}`, `EXPEDIENTE_${idReal}.zip`);
            } else {
                // Descarga secuencial de plantillas individuales
                try {
                    const respPlantillas = await fetch('/reportes/obtener_lista_plantillas');
                    const plantillas = await respPlantillas.json();
                    
                    plantillas.forEach((nombre, i) => {
                        setTimeout(() => {
                            descargarArchivo(`/reportes/descargar_individual/${idReal}/${nombre}?formato=${opciones.formato}`, "");
                        }, i * 900); // Un pequeño retraso evita que el navegador bloquee descargas múltiples
                    });
                } catch (err) {
                    console.error("No se pudo obtener la lista de plantillas:", err);
                }
            }

            // Alerta de éxito final
            Swal.fire({
                icon: 'success',
                title: '¡Proceso Completado!',
                text: 'Los archivos se están descargando. Revisa tu carpeta de descargas.',
                confirmButtonText: 'Entendido',
                allowOutsideClick: false
            }).then(() => {
                // Recargamos para limpiar todo o redirigimos al historial
                location.reload(); 
            });

        } else {
            // Error lógico devuelto por Flask (ej: falta un dato en la DB)
            Swal.fire('Error de Guardado', resultado.message || "No se pudo procesar el expediente", 'error');
        }
    } catch (error) {
        console.error("Error Crítico:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error de Conexión',
            text: 'Hubo un problema al conectar con el servidor: ' + error.message
        });
    }
}