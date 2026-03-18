// 1. Variables globales actualizadas
let datosHistorialCache = [];
let ordenDescendente = true; 
let paginaActual = 1;      // Nueva: Para saber dónde estamos
let idColegioActual = null; // Nueva: Para poder navegar entre páginas
let ordenActual = 'desc'; // Por defecto los más nuevos



// --- CAMBIO AQUÍ: Agregamos nombreColegio como parámetro ---
function abrirHistorial(colegioId, pagina = 1, nombreColegio = '') {

    // Ahora sí, esta condición no romperá el código
    if (nombreColegio) {
        const tituloModal = document.querySelector('#modalHistorial .modal-title');
        if (tituloModal) tituloModal.innerText = `Historial de Procesos: ${nombreColegio}`;
    }

    // 1. Guardamos el contexto actual
    idColegioActual = colegioId;
    paginaActual = pagina;

    const modalElement = document.getElementById('modalHistorial');
    const contenedor = document.getElementById('contenedorHistorial');

    // --- MEJORA: CAPTURAR BÚSQUEDA ---
    // Si la página es 1, a veces queremos resetear la búsqueda al cambiar de colegio
    const inputPrevio = document.getElementById('buscarProceso');
    let query = inputPrevio ? inputPrevio.value : ''; 

    // Inicializamos el modal de Bootstrap
    let myModal = bootstrap.Modal.getInstance(modalElement);
    if (!myModal) {
        myModal = new bootstrap.Modal(modalElement);
    }

    // 2. Renderizamos la estructura base (Solo en página 1)
    if (pagina === 1) {
        contenedor.innerHTML = `
            <div class="px-4 mt-4 mb-4">
                <div class="row g-2 justify-content-center align-items-center">
                    <div class="col-12 col-md-8">
                        <div class="input-group shadow-sm" style="height: 48px;">
                            <span class="input-group-text bg-white border-end-0 text-primary px-3">
                                <i class="bi bi-search"></i>
                            </span>
                            <input type="text" id="buscarProceso" 
                                   class="form-control border-start-0 ps-2" 
                                   placeholder="Buscar proceso..." 
                                   oninput="filtrarHistorial()"
                                   value="${query}">
                        </div>
                    </div>
                    <div class="col-12 col-md-2">
                        <button onclick="alternarOrden()" class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center" style="height: 48px;">
                            <i class="bi bi-sort-numeric-down"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div id="listaProcesosReal" class="mt-3">
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2 text-muted small">Cargando expedientes...</p>
                </div>
            </div>
            <div id="paginacionControles" class="pb-4"></div>`;
        
        // Solo mostramos el modal si no está ya a la vista
        if (!modalElement.classList.contains('show')) {
            myModal.show();
        }

    } else {
        // Cambio de página: solo spinner en la lista
        const lista = document.getElementById('listaProcesosReal');
        if (lista) {
            lista.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2 text-muted small">Cargando página ${pagina}...</p>
                </div>`;
        }
    }

    // 3. FETCH de datos
    fetch(`/historial/historial_json/${colegioId}?page=${pagina}&q=${encodeURIComponent(query)}&orden=${ordenActual}`)
        .then(response => {
            if (!response.ok) throw new Error('Error en la red');
            return response.json();
        })
        .then(data => {
            const listaReal = document.getElementById('listaProcesosReal');
            if (!listaReal) return; 

            if (!data.procesos || data.procesos.length === 0) {
                listaReal.innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-folder2-open display-4 text-muted opacity-50"></i>
                        <p class="text-muted mt-3">No se encontraron registros.</p>
                    </div>`;
                document.getElementById('paginacionControles').innerHTML = '';
                return;
            }

            datosHistorialCache = data.procesos;

            // Detectamos si estamos en la interfaz de administrador
            // Esto asume que tu URL de admin contiene la palabra "admin"
            const esAdmin = window.location.pathname.includes('admin'); 
            
            dibujarListaProcesos(datosHistorialCache, esAdmin); 
            renderizarPaginacion(data);
        })
        .catch(error => {
            console.error('Error:', error);
            const listaReal = document.getElementById('listaProcesosReal');
            if (listaReal) {
                listaReal.innerHTML = `<div class="alert alert-danger m-4">Error al conectar con el servidor.</div>`;
            }
        });
}

// Función para alternar orden y redibujar
function alternarOrden() {
    // 1. Alternamos el valor de la variable global
    ordenActual = (ordenActual === 'desc') ? 'asc' : 'desc';

    // 2. Llamamos a abrirHistorial en la página 1 para que traiga 
    // los datos ordenados desde la base de datos
    abrirHistorial(idColegioActual, 1);
}

// Añadimos modoAdmin = false como parámetro por defecto
function dibujarListaProcesos(data, modoAdmin = false) {
    const listaReal = document.getElementById('listaProcesosReal');
    
    if (!data || data.length === 0) {
        listaReal.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-folder2-open display-4 text-muted opacity-50"></i>
                <p class="text-muted mt-3">No hay registros para mostrar en esta página.</p>
            </div>`;
        return;
    }

    let html = '<div class="list-group list-group-flush border-top">';

    data.forEach((proceso) => {
        html += `
        <div class="list-group-item list-group-item-action py-3 px-4 border-bottom">
            <div class="row align-items-center">
                <div class="col-auto text-center border-end pe-4" style="min-width: 120px;">
                    <div class="fw-bold text-primary h5 mb-0">${proceso.vigencia}</div>
                    <div class="badge bg-secondary-subtle text-secondary border small">PROCESO #${proceso.numero_proceso_colegio || '-' }</div>
                </div>

                <div class="col ms-2">
                    <div class="d-flex align-items-center mb-1">
                        <i class="bi bi-briefcase text-secondary me-2"></i>
                        <h6 class="mb-0 text-uppercase fw-bold text-dark" style="font-size: 0.9rem;">
                            ${proceso.tipo_contrato} 
                        </h6>
                        <span class="ms-2 text-muted small fw-normal">| ID: ${proceso.numero_proceso_colegio || '-' }</span>
                    </div>
                    <div class="text-muted small">
                        <i class="bi bi-person-check-fill me-1 text-success"></i> 
                        <strong>CONTRATISTA:</strong> ${proceso.proveedor}
                    </div>
                </div>

                <div class="col-auto">
                    <div class="d-flex gap-2">
                        <button onclick="opcionesDescargaHistorial(${proceso.id})" 
                                class="btn btn-sm btn-primary d-flex align-items-center px-2 shadow-sm" title="Descargar">
                            <i class="bi bi-cloud-arrow-down-fill"></i>
                        </button>

                       
                            <button onclick="editarProceso(${proceso.id})" 
                                    class="btn btn-sm btn-outline-warning px-2" title="Editar Proceso">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                         ${modoAdmin ? `
                            <button onclick="eliminarProcesoHistorial(${proceso.id}, '${proceso.tipo_contrato}')" 
                                    class="btn btn-sm btn-outline-danger px-2" title="Eliminar Definitivamente">
                                <i class="bi bi-trash3"></i>
                            </button>
                        ` : ''}

                        <button onclick="verDetalleProceso(${proceso.id})" 
                                class="btn btn-sm btn-outline-secondary px-2" title="Ver Detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    });

    html += '</div>';
    listaReal.innerHTML = html;
}

// NUEVA FUNCIÓN: Crea los botones de Anterior y Siguiente
function renderizarPaginacion(data) {
    const contenedorPaginacion = document.getElementById('paginacionControles');
    
    // Si solo hay una página, no mostramos controles
    if (data.total_paginas <= 1) {
        contenedorPaginacion.innerHTML = '';
        return;
    }

    contenedorPaginacion.innerHTML = `
        <div class="d-flex justify-content-center align-items-center mt-4">
            <nav aria-label="Navegación de historial">
                <ul class="pagination pagination-sm mb-0 shadow-sm">
                    <li class="page-item ${!data.tiene_anterior ? 'disabled' : ''}">
                        <a class="page-link py-2 px-3" href="javascript:void(0)" 
                           onclick="${data.tiene_anterior ? `abrirHistorial(${idColegioActual}, ${data.pagina_actual - 1})` : ''}">
                            <i class="bi bi-chevron-left me-1"></i> Anterior
                        </a>
                    </li>

                    <li class="page-item disabled">
                        <span class="page-link bg-white text-dark fw-bold py-2 px-3">
                            Página ${data.pagina_actual} de ${data.total_paginas}
                        </span>
                    </li>

                    <li class="page-item ${!data.tiene_siguiente ? 'disabled' : ''}">
                        <a class="page-link py-2 px-3" href="javascript:void(0)" 
                           onclick="${data.tiene_siguiente ? `abrirHistorial(${idColegioActual}, ${data.pagina_actual + 1})` : ''}">
                            Siguiente <i class="bi bi-chevron-right ms-1"></i>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
        <div class="text-center mt-2">
            <small class="text-muted">Total de registros: ${data.total_registros}</small>
        </div>
    `;
}

// Las demás funciones (filtrar, detalle, descarga) se mantienen igual
let timerBusquedaHistorial; // Variable para el debounce

function filtrarHistorial() {
    const input = document.getElementById('buscarProceso');
    const query = input.value.trim();

    // Limpiamos el timer anterior
    clearTimeout(timerBusquedaHistorial);

    // Esperamos 400ms antes de disparar la búsqueda al servidor
    timerBusquedaHistorial = setTimeout(() => {
        // Llamamos a la función principal siempre a la página 1
        abrirHistorial(idColegioActual, 1);
    }, 400);
}

function verDetalleProceso(procesoId) {
    const p = datosHistorialCache.find(item => item.id === procesoId);
    if (p) {
        document.getElementById('det_vigencia').innerText = p.vigencia;
        document.getElementById('det_tipo_contrato').innerText = p.tipo_contrato;
        document.getElementById('det_objeto').innerText = p.objeto || "Sin descripción";
        document.getElementById('det_proveedor').innerText = p.proveedor;
        document.getElementById('det_nit_proveedor').innerText = p.nit_proveedor;
        document.getElementById('det_valor').innerText = p.valor;
        document.getElementById('det_plazo').innerText = p.plazo;
        document.getElementById('det_fecha').innerText = p.fecha_creacion;
        const modalDetalle = new bootstrap.Modal(document.getElementById('modalDetalleProceso'));
        modalDetalle.show();
    }
}

function opcionesDescargaHistorial(procesoId) {
    Swal.fire({
        title: 'Opciones de Expediente',
        html: `
            <div class="text-start mt-2">
                <label class="form-label fw-bold small">1. Seleccione Formato</label>
                <select id="swal-formato" class="form-select mb-3">
                    <option value="pdf">Documento PDF (.pdf)</option>
                    <option value="word">Microsoft Word (.docx)</option>
                </select>
                <label class="form-label fw-bold small">2. Seleccione Modo</label>
                <select id="swal-modo" class="form-select">
                    <option value="solo">Descargar idividualmente</option>
                    <option value="zip">Paquete Completo (ZIP)</option>
                </select>
            </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Descargar',
        confirmButtonColor: '#0d6efd',
        preConfirm: () => {
            return {
                formato: document.getElementById('swal-formato').value,
                modo: document.getElementById('swal-modo').value
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            procesarDescargaEfectiva(procesoId, result.value);
        }
    });
}

async function procesarDescargaEfectiva(procesoId, opciones) {
    Swal.fire({
        title: 'Generando Documentos...',
        text: 'Estamos preparando tus archivos del historial. Por favor, no cierres esta ventana.',
        allowOutsideClick: false,
        didOpen: () => { 
            Swal.showLoading(); 
        }
    });

    try {
        const descargarArchivo = (url, nombreSugerido) => {
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', nombreSugerido);
            link.setAttribute('target', '_blank');
            document.body.appendChild(link);
            link.click();
            link.remove();
        };

        if (opciones.modo === 'zip') {
            // --- CASO ZIP ---
            const urlZip = `/reportes/descargar_zip/${procesoId}?formato=${opciones.formato}`;
            descargarArchivo(urlZip, `PAQUETE_EXPEDIENTE_${procesoId}.zip`);
            
            // PEQUEÑO TRUCO: Esperamos 1.5 segundos para que el servidor respire y mostramos éxito
            await new Promise(resolve => setTimeout(resolve, 1500));

        } else {
            // --- CASO INDIVIDUAL ---
            const respPlantillas = await fetch('/reportes/obtener_lista_plantillas');
            if (!respPlantillas.ok) throw new Error("No se pudo obtener la lista de plantillas.");
            
            const plantillas = await respPlantillas.json();

            await new Promise((resolve) => {
                plantillas.forEach((nombreArchivo, index) => {
                    setTimeout(() => {
                        const urlIndiv = `/reportes/descargar_individual/${procesoId}/${nombreArchivo}?formato=${opciones.formato}`;
                        descargarArchivo(urlIndiv, ""); 
                        if (index === plantillas.length - 1) resolve();
                    }, index * 900);
                });
            });
        }

        // --- ESTA PARTE AHORA SÍ SE EJECUTARÁ PARA AMBOS ---
        Swal.fire({
            icon: 'success',
            title: '¡Descarga Iniciada!',
            text: 'Los archivos se están procesando. Revisa tu carpeta de descargas.',
            confirmButtonText: 'Entendido',
            allowOutsideClick: false
        });

    } catch (error) {
        console.error("Error al descargar:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error de Descarga',
            text: 'Hubo un problema: ' + error.message
        });
    }
}

async function eliminarProcesoHistorial(idProceso) {
    const { value: confirmacion } = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción no se puede deshacer y eliminará todos los ítems asociados.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacion) {
        try {
            // Mostrar carga
            Swal.fire({
                title: 'Eliminando...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const response = await fetch(`/procesos/eliminar_proceso/${idProceso}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire('¡Eliminado!', result.message, 'success').then(() => {
                    // Refrescar el historial después de eliminar
                    // idColegioActual debe estar disponible globalmente
                    if (typeof abrirHistorial === 'function') {
                        abrirHistorial(idColegioActual, paginaActual);
                    } else {
                        location.reload(); // Opción de respaldo
                    }
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error("Error:", error);
            Swal.fire('Error', 'No se pudo eliminar el proceso: ' + error.message, 'error');
        }
    }
}

// --- EXPOSICIÓN GLOBAL PARA QUE LOS BOTONES ONCLICK FUNCIONEN ---
window.abrirHistorial = abrirHistorial;
window.alternarOrden = alternarOrden;
window.filtrarHistorial = filtrarHistorial;
window.verDetalleProceso = verDetalleProceso;
window.opcionesDescargaHistorial = opcionesDescargaHistorial;
window.editarProceso = editarProceso; // Si la tienes definida
window.eliminarProcesoHistorial = eliminarProcesoHistorial; // La que crearemos abajo