
let paginaActual = 1;
let terminoBusqueda = "";

// 1. Función principal para obtener datos
async function cargarColegios(pagina = 1, q = "") {
    const contenedor = document.getElementById('contenedorColegios');
    
    try {
        const response = await fetch(`/colegios/colegios_json_paginado?page=${pagina}&q=${encodeURIComponent(q)}`);
        const data = await response.json();

        dibujarTarjetas(data.colegios);
        dibujarPaginacion(data.total_paginas, data.pagina_actual);
    } catch (error) {
        console.error("Error cargando colegios:", error);
        contenedor.innerHTML = `<div class="alert alert-danger w-100">Error al cargar los datos.</div>`;
    }
}

// 2. Función para dibujar las tarjetas (IDÉNTICO A TU HTML)
function dibujarTarjetas(colegios) {
    const contenedor = document.getElementById('contenedorColegios');
    contenedor.innerHTML = "";

    if (colegios.length === 0) {
        contenedor.innerHTML = `<div class="col-12 text-center my-5"><h4 class="text-muted">No se encontraron colegios</h4></div>`;
        return;
    }

    colegios.forEach(col => {
        const logoUrl = col.logo_path ? `/static/uploads/${col.logo_path}` : null;
        
        const cardHtml = `
            <div class="col col-card">
                <div class="card h-100 shadow-sm border-0 position-relative card-hover">
                    <div class="d-flex justify-content-center align-items-center bg-light rounded-top p-4" style="height: 160px;">
                        ${logoUrl 
                            ? `<img src="${logoUrl}" class="img-fluid rounded" style="max-height: 120px; object-fit: contain;">`
                            : `<i class="bi bi-bank fs-1 opacity-25 text-muted"></i>`
                        }
                    </div>

                    <div class="card-body text-center">
                        <a href="/colegios/${col.id}" class="stretched-link text-decoration-none">
                            <h5 class="card-title text-primary fw-bold mb-1">${col.nombre}</h5>
                        </a>
                        <p class="text-muted small mb-3">
                            <i class="bi bi-geo-alt"></i> ${col.municipio}
                        </p>
                        <div class="bg-light p-2 rounded-3">
                            <p class="mb-0 small text-secondary">Rector(a):</p>
                            <p class="mb-0 fw-semibold text-dark">${col.rector_nombre}</p>
                        </div>
                    </div>
                      
                    <div class="card-footer bg-transparent border-0 pb-3 d-flex justify-content-center gap-2" style="z-index: 2; position: relative;">
                        <button class="btn btn-sm btn-outline-warning rounded-circle" 
                          title="Editar" 
                                 onclick='prepararEdicion(${JSON.stringify(col)})'>
                                    <i class="bi bi-pencil"></i>
                           </button>
                    </div>
                </div>
            </div>
        `;
        contenedor.innerHTML += cardHtml;
    });
}

// 3. Función para la paginación
function dibujarPaginacion(total, actual) {
    const nav = document.getElementById('paginacionColegios');
    nav.innerHTML = "";

    if (total <= 1) return;

    // Botón Anterior
    nav.innerHTML += `
        <li class="page-item ${actual === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="cambiarPagina(${actual - 1})">Anterior</a>
        </li>
    `;

    // Números de página
    for (let i = 1; i <= total; i++) {
        nav.innerHTML += `
            <li class="page-item ${i === actual ? 'active' : ''}">
                <a class="page-link" href="#" onclick="cambiarPagina(${i})">${i}</a>
            </li>
        `;
    }

    // Botón Siguiente
    nav.innerHTML += `
        <li class="page-item ${actual === total ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="cambiarPagina(${actual + 1})">Siguiente</a>
        </li>
    `;
}

function cambiarPagina(p) {
    event.preventDefault();
    paginaActual = p;
    cargarColegios(paginaActual, terminoBusqueda);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// 4. Buscador en tiempo real
const inputBusqueda = document.querySelector('.search-input');
let timer;

inputBusqueda.addEventListener('input', (e) => {
    clearTimeout(timer);
    terminoBusqueda = e.target.value;
    timer = setTimeout(() => {
        paginaActual = 1;
        cargarColegios(paginaActual, terminoBusqueda);
    }, 400);
});

// Carga Inicial
document.addEventListener('DOMContentLoaded', () => cargarColegios());