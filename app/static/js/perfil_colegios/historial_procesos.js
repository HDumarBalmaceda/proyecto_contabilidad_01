// 1. Variables globales
let datosHistorialCache = [];
let ordenDescendente = true; 

function abrirHistorial(colegioId) {
    const modalElement = document.getElementById('modalHistorial');
    const myModal = new bootstrap.Modal(modalElement);
    const contenedor = document.getElementById('contenedorHistorial');

    // 2. Buscador a la izquierda (col-md-8) y Botón Filtro a la derecha (col-md-2)
    contenedor.innerHTML = `
        <div class="px-4 mt-4 mb-4">
            <div class="row g-2 justify-content-center align-items-center">
                <div class="col-12 col-md-8">
                    <div class="input-group shadow-sm" style="height: 48px;">
                        <span class="input-group-text bg-white border-end-0 text-primary px-3">
                            <i class="bi bi-search" style="font-size: 1.1rem;"></i>
                        </span>
                        <input type="text" id="buscarProceso" 
                               class="form-control border-start-0 ps-2" 
                               placeholder="Buscar por contratista, objeto o vigencia..." 
                               onkeyup="filtrarHistorial()"
                               style="font-size: 0.95rem;">
                    </div>
                </div>

                <div class="col-12 col-md-2">
                    <button id="btnOrden" onclick="alternarOrden()" 
                            class="btn btn-sm btn-outline-secondary shadow-sm w-100 d-flex align-items-center justify-content-center" 
                            style="height: 38px; font-size: 0.85rem; font-weight: 500; border-radius: 8px;">
                        <i class="bi bi-sort-numeric-down me-1" id="iconoOrden" style="font-size: 1.1rem;"></i>
                        <span id="textoOrden">Recientes</span>
                    </button>
                </div>
            </div>
        </div>
        
        <div id="listaProcesosReal" class="mt-3">
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted small">Organizando expedientes...</p>
            </div>
        </div>`;

    myModal.show();

    fetch(`/historial/historial_json/${colegioId}`)
        .then(response => {
            if (!response.ok) throw new Error('Error en la red');
            return response.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                document.getElementById('listaProcesosReal').innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-folder2-open display-4 text-muted opacity-50"></i>
                        <p class="text-muted mt-3">No se encontraron procesos previos.</p>
                    </div>`;
                return;
            }

            datosHistorialCache = data;
            // Llamamos a la función que dibuja con tu diseño original
            dibujarListaProcesos(datosHistorialCache);
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('listaProcesosReal').innerHTML = 
                `<div class="alert alert-danger m-3 small">Error al cargar historial.</div>`;
        });
}
window.abrirHistorial = abrirHistorial;

// Función para alternar orden y redibujar
function alternarOrden() {
    const btnTexto = document.getElementById('textoOrden');
    const btnIcono = document.getElementById('iconoOrden');
    
    ordenDescendente = !ordenDescendente;

    datosHistorialCache.sort((a, b) => {
        return ordenDescendente ? (b.id - a.id) : (a.id - b.id);
    });

    if (ordenDescendente) {
        btnTexto.innerText = "Recientes";
        btnIcono.className = "bi bi-sort-numeric-down me-1";
    } else {
        btnTexto.innerText = "Antiguos";
        btnIcono.className = "bi bi-sort-numeric-up me-1";
    }

    dibujarListaProcesos(datosHistorialCache);
}

// Función diseño de tarjetas - ACTUALIZADA
function dibujarListaProcesos(data) {
    const listaReal = document.getElementById('listaProcesosReal');
    let html = '<div class="list-group list-group-flush border-top">';

    data.forEach((proceso) => {
        // Usamos proceso.id para que el número sea fijo y real según la base de datos
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
                                class="btn btn-sm btn-primary d-flex align-items-center px-3 shadow-sm">
                            <i class="bi bi-cloud-arrow-down-fill me-1"></i> DESCARGAR
                        </button>
                        <button onclick="editarProceso(${proceso.id})" 
                                class="btn btn-sm btn-outline-warning px-3" title="Editar Proceso">
                                  <i class="bi bi-pencil-square"></i>
                        </button>
                        <button onclick="verDetalleProceso(${proceso.id})" 
                                class="btn btn-sm btn-outline-secondary px-3">
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

// Las demás funciones (filtrar, detalle, descarga) se mantienen igual
function filtrarHistorial() {
    let input = document.getElementById('buscarProceso').value.toLowerCase();
    let items = document.querySelectorAll('#listaProcesosReal .list-group-item');
    items.forEach(item => {
        let texto = item.innerText.toLowerCase();
        item.style.display = texto.includes(input) ? "" : "none";
    });
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
                    <option value="solo">Descargar uno por uno</option>
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

// funcion para descargar los procesos antiguo
async function procesarDescargaEfectiva(procesoId, opciones) {
    // 1. Alerta de espera
    Swal.fire({
        title: 'Preparando Expediente...',
        text: 'Generando documentos con sellos y firmas actuales.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // Función interna para disparar la descarga real
        const descargarArchivo = (url, nombreSugerido) => {
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', nombreSugerido);
            link.setAttribute('target', '_blank');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        if (opciones.modo === 'zip') {
            // Caso A: Descargar todo en un ZIP
            const urlZip = `/reportes/descargar_zip/${procesoId}?formato=${opciones.formato}`;
            descargarArchivo(urlZip, `PAQUETE_EXPEDIENTE_${procesoId}.zip`);
            
            Swal.fire({
                icon: 'success',
                title: '¡Descarga iniciada!',
                text: 'Tu paquete ZIP se está procesando.',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            // Caso B: Descargar archivos uno por uno (como en tu otro formulario)
            const respPlantillas = await fetch('/reportes/obtener_lista_plantillas');
            const plantillas = await respPlantillas.json();

            plantillas.forEach((nombreArchivo, index) => {
                setTimeout(() => {
                    const urlIndiv = `/reportes/descargar_individual/${procesoId}/${nombreArchivo}?formato=${opciones.formato}`;
                    descargarArchivo(urlIndiv, ""); 
                    
                    if (index === plantillas.length - 1) {
                        Swal.fire('¡Listo!', 'Los archivos se están descargando individualmente.', 'success');
                    }
                }, index * 1000); // Retraso de 1 segundo entre archivos
            });
        }
    } catch (error) {
        console.error("Error al descargar:", error);
        Swal.fire('Error', 'No se pudo conectar con el servidor de reportes.', 'error');
    }
}