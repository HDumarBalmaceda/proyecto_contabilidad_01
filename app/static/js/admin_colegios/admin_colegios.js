/**
 * GESTIÓN INTEGRADA DE COLEGIOS (TABLA DINÁMICA + MODAL + VISTA PREVIA)
 */

// --- 1. CARGA Y RENDERIZADO (TABLA) ---
async function cargarColegios(page = 1) {
    const query = document.getElementById('busquedaColegio')?.value.trim() || '';
    const contenedor = document.getElementById('tablaColegiosBody');
    
    contenedor.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">
        <div class="spinner-border text-primary mb-2"></div><br>Cargando...
    </td></tr>`;

    try {
        const response = await fetch(`/colegios/colegios_json_paginado?page=${page}&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        renderizarTablaColegios(data.colegios);
        renderizarPaginacionColegios(data);
    } catch (error) {
        contenedor.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Error de conexión</td></tr>`;
    }
}

function renderizarTablaColegios(colegios) {
    const tbody = document.getElementById('tablaColegiosBody');
    tbody.innerHTML = '';

    if (!colegios || colegios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">No hay resultados</td></tr>`;
        return;
    }

    colegios.forEach(col => {
        const logoHTML = col.logo_path 
            ? `<img src="/static/uploads/${col.logo_path}" style="width: 100%; height: 100%; object-fit: cover;">`
            : `<i class="fas fa-school text-primary"></i>`;

        const contadorBadge = col.contador_nombre 
            ? `<span class="badge bg-info text-dark px-3"><i class="bi bi-person-check-fill"></i> ${col.contador_nombre}</span>`
            : `<span class="badge bg-danger text-white px-3"><i class="bi bi-person-x-fill"></i> SIN ASIGNAR</span>`;

        const dataAttrs = `
                data-id="${col.id}" 
                data-nombre="${col.nombre || ''}" 
                data-nit="${col.nit || ''}"
                data-direccion="${col.direccion || ''}" 
                data-telefono="${col.telefono || ''}"
                data-municipio="${col.municipio || ''}" 
                data-rector_nombre="${col.rector_nombre || ''}"
                data-rector_documento="${col.rector_documento || ''}" 
                data-rector_tipo_documento="${col.rector_tipo_documento || 'CC'}"
                data-logo="${col.logo_path || ''}" 
                data-firma="${col.firma_path || ''}"
         `.trim(); // Usamos trim para limpiar espacios extras

        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-light d-flex align-items-center justify-content-center me-3" 
                             style="width: 45px; height: 45px; border: 1px solid #dee2e6; overflow: hidden;">
                            ${logoHTML}
                        </div>
                        <div>
                            <span class="fw-bold d-block text-dark">${col.nombre}</span>
                            <small class="text-muted">Rector: ${col.rector_nombre}</small>
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-light text-dark border px-3">${col.nit}</span></td>
                <td><div class="small">${col.municipio}</div></td>
                <td>${contadorBadge}</td>
                <td class="text-center">
                    <div class="btn-group gap-1">
                        <button class="btn btn-sm btn-outline-info" title="Ver Historial de Procesos" 
                                onclick="abrirHistorial(${col.id}, 1, '${col.nombre}')">
                            <i class="bi bi-archive-fill"></i>
                        </button>

                        <button class="btn btn-sm btn-outline-warning btn-editar" title="Editar" 
                                data-bs-toggle="modal" data-bs-target="#crearColegioModal" ${dataAttrs}>
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        
                        <button class="btn btn-sm btn-outline-danger btn-eliminar" title="Eliminar" 
                                data-id="${col.id}" data-nombre="${col.nombre}">
                            <i class="bi bi-trash3-fill"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `);
    });
}

function renderizarPaginacionColegios(data) {
    const nav = document.getElementById('paginacionColegios');
    if (!nav) return;
    nav.innerHTML = `
        <div class="d-flex justify-content-between align-items-center w-100">
            <small class="text-muted">Total: ${data.total_registros}</small>
            <ul class="pagination pagination-sm mb-0">
                <li class="page-item ${!data.tiene_anterior ? 'disabled' : ''}">
                    <button class="page-link" onclick="cargarColegios(${data.pagina_actual - 1})">Ant.</button>
                </li>
                <li class="page-item active"><span class="page-link">${data.pagina_actual}</span></li>
                <li class="page-item ${!data.tiene_siguiente ? 'disabled' : ''}">
                    <button class="page-link" onclick="cargarColegios(${data.pagina_actual + 1})">Sig.</button>
                </li>
            </ul>
        </div>`;
}

// --- 2. VISTAS PREVIAS DE IMÁGENES ---
function configurarVistaPrevia(inputId, previewId, textId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const text = document.getElementById(textId);

    if (input && preview && text) {
        input.addEventListener("change", function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => {
                    preview.src = e.target.result;
                    preview.classList.remove("d-none");
                    text.classList.add("d-none");
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// --- 3. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', function() {
    cargarColegios(1);
    configurarVistaPrevia("logo_path", "previewLogo", "logoText");
    configurarVistaPrevia("firma_path", "previewFirma", "firmaText");

    // Buscador
    let timer;
    document.getElementById('busquedaColegio')?.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => cargarColegios(1), 400);
    });

    // Lógica del Modal (Editar vs Nuevo)
    const modal = document.getElementById('crearColegioModal');

if (modal) {
    modal.addEventListener('show.bs.modal', function(e) {
        const btn = e.relatedTarget;
        const form = document.getElementById('formCrearColegio') || document.getElementById('formColegio');
        const id = btn?.getAttribute('data-id');
        const modalTitle = document.getElementById('modalTitle');
        const btnGuardar = document.getElementById('btn-guardar-nuevo');
        const btnActualizar = document.getElementById('btn-actualizar-edit');

        if (id) {
            // --- MODO EDICIÓN ---
            if (modalTitle) modalTitle.textContent = "Editar Colegio";
            form.action = `/colegios/editar/${id}`;
            
            if (btnGuardar) btnGuardar.classList.add('d-none');
            if (btnActualizar) btnActualizar.classList.remove('d-none');

            const fields = ['nombre', 'nit', 'direccion', 'telefono', 'municipio', 'rector_nombre', 'rector_documento', 'rector_tipo_documento'];
            fields.forEach(f => {
                const el = document.getElementById(f);
                const val = btn.getAttribute(`data-${f}`);
                if (el) {
                    el.value = (val && val !== 'None') ? val : '';
                }
            });

            // Debug de imágenes en edición
            const logo = btn.getAttribute('data-logo');
            const firma = btn.getAttribute('data-firma'); // Verifica que tu botón tenga data-firma
            
            if (logo && logo !== 'None') {
                const pLogo = document.getElementById('previewLogo');
                pLogo.src = `/static/uploads/${logo}`;
                pLogo.classList.remove('d-none');
                document.getElementById('logoText')?.classList.add('d-none');
            }
            
            if (firma && firma !== 'None') {
                const pFirma = document.getElementById('previewFirma');
                pFirma.src = `/static/uploads/${firma}`;
                pFirma.classList.remove('d-none');
                document.getElementById('firmaText')?.classList.add('d-none');
            }

        } else {
            // --- MODO NUEVO ---
            if (modalTitle) modalTitle.textContent = "Registrar Nuevo Colegio";
            
            form.reset();
            form.action = "/colegios/crear";
            
            // Forzamos valores limpios
            const selTipo = document.getElementById('rector_tipo_documento');
            if (selTipo) selTipo.value = "CC"; 

            const inpDoc = document.getElementById('rector_documento');
            if (inpDoc) inpDoc.value = ""; 

            if (btnGuardar) btnGuardar.classList.remove('d-none');
            if (btnActualizar) btnActualizar.classList.add('d-none');
            
            // Limpiar visualmente las cajas de upload
            document.querySelectorAll('.upload-box img').forEach(img => {
                img.src = "#";
                img.classList.add('d-none');
            });
            document.querySelectorAll('.upload-box span').forEach(span => span.classList.remove('d-none'));
            
            // Limpiar inputs de archivo físicamente
            document.getElementById('logo_path').value = "";
            document.getElementById('firma_path').value = "";
        }
    });
}

// ---  INTERCEPTOR CRÍTICO: ¿Qué se está enviando realmente? ---
const formColegio = document.getElementById('formCrearColegio') || document.getElementById('formColegio');
if (formColegio) {
    formColegio.addEventListener('submit', function(e) {
        const formData = new FormData(this);
        
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
            } else {
            
            }
        }
        
        // Si el tamaño de la firma es 0, sabremos que el problema es el input
    });
}

    // Eliminar
    document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-eliminar');
    if (btn) {
        Swal.fire({
            title: '¿Eliminar Colegio?',
            text: `Se borrará permanentemente: ${btn.dataset.nombre}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(r => {
            if (r.isConfirmed) {
                // 1. Usamos fetch para enviar el método DELETE
                fetch(`/colegios/eliminar/${btn.dataset.id}`, {
                    method: 'DELETE',
                    // Importante: Si usas Flask-WTF, necesitas el token CSRF
                    headers: {
                        'X-CSRFToken': document.querySelector('input[name="csrf_token"]')?.value
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        Swal.fire('¡Eliminado!', data.message, 'success');
                        // 2. Refrescamos la tabla dinámicamente sin recargar la página
                        cargarColegios(1); 
                    } else {
                        Swal.fire('Error', data.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Swal.fire('Error', 'No se pudo procesar la eliminación', 'error');
                });
            }
        });
      }
   });
});