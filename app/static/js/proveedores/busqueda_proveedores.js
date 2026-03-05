document.addEventListener('DOMContentLoaded', function() {
    const inputBusqueda = document.getElementById('buscarProveedor');
    const tabla = document.getElementById('tablaProveedores');
    const filas = tabla.getElementsByTagName('tbody')[0].getElementsByTagName('tr');

    inputBusqueda.addEventListener('keyup', function() {
        const texto = inputBusqueda.value.toLowerCase();

        Array.from(filas).forEach(fila => {
            // Obtenemos el texto de las celdas de Nombre (col 0) y NIT (col 1)
            const nombre = fila.cells[0].textContent.toLowerCase();
            const nit = fila.cells[1].textContent.toLowerCase();

            // Si el texto coincide con nombre o nit, mostramos la fila, si no, la ocultamos
            if (nombre.includes(texto) || nit.includes(texto)) {
                fila.style.display = '';
            } else {
                fila.style.display = 'none';
            }
        });
    });
});