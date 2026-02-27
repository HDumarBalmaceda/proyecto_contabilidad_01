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
    Swal.fire({
        title: 'Generando Documentos...',
        text: 'Estamos preparando tus archivos. Por favor, no cierres esta ventana.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // 1. Guardamos los datos en el controlador de PROCESOS
        const response = await fetch(`/procesos/guardar_proceso/${colegioId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const resultado = await response.json();

        if (resultado.status === 'success') {
            
            // --- LÓGICA DE DESCARGA SEGÚN EL MODO ---
            
       if (resultado.status === 'success') {
            
            // Función mejorada para descargar con nombre correcto
            const descargarArchivo = (url, nombreSugerido) => {
                const link = document.createElement('a');
                link.href = url;
                // El atributo download es la clave para el nombre
                link.setAttribute('download', nombreSugerido);
                link.setAttribute('target', '_blank'); // Ayuda a evitar bloqueos de seguridad
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };

            if (opciones.modo === 'zip') {
                // Nombre para el ZIP
                const nombreZip = `PAQUETE_EXPEDIENTE_${resultado.proceso_id}.zip`;
                const urlZip = `/reportes/descargar_zip/${resultado.proceso_id}?formato=${opciones.formato}`;
                descargarArchivo(urlZip, nombreZip);

            } else {
                try {
                    const respPlantillas = await fetch('/reportes/obtener_lista_plantillas');
                    const plantillas = await respPlantillas.json();

                    plantillas.forEach((nombreArchivo, index) => {
                        setTimeout(() => {
                            const urlIndiv = `/reportes/descargar_individual/${resultado.proceso_id}/${nombreArchivo}?formato=${opciones.formato}`;
                            // Aquí no enviamos nombreSugerido porque el controlador de Python 
                            // ya lo genera con el conteo (01, 02...) en el send_file
                            descargarArchivo(urlIndiv, ""); 
                        }, index * 1000);
                    });
                } catch (err) {
                    console.error("Error al obtener plantillas:", err);
                }
            }
            }

            // 2. Cambiamos la alerta a modo "Listo"
            Swal.fire({
                icon: 'success',
                title: '¡Proceso Iniciado!',
                html: `
                    <div class="text-center">
                        <p>Los archivos se están procesando y enviando.</p>
                        <p class="text-muted small">Si seleccionaste "Independientemente", los archivos bajarán uno tras otro.</p>
                        <hr>
                        <button type="button" class="btn btn-primary" onclick="location.reload()">
                            Finalizar 
                        </button>
                    </div>
                `,
                showConfirmButton: false,
                allowOutsideClick: false
            });

        } else {
            Swal.fire('Error', resultado.message, 'error');
        }
    } catch (error) {
        console.error("Error:", error);
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    }
}