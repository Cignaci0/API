
//Importa la librería 'mssql' (Microsoft SQL Server) para interactuar con la base de datos.
import mssql from "mssql"

//const de configuración con los datos de conexión a la base de datos de AWS RDS.
const datosConexion = {
    server:"aquaml.cdem84i2eeoa.us-east-2.rds.amazonaws.com",
    database :"AquaML",
    user:"cristopher",
    password:"Cristopher2003",
    options:{
        encrypt:true, // Forzar la encriptación de la conexión ( esto para que sea mas segura ) 
        trustServerCertificate: true // Confiar en el certificado del servidor (necesario para AWS RDS).
    }
};

/*
Establece y devuelve una conexión a la base de datos SQL Server.
Esta función es asíncrona porque la conexión puede tardar.
*/

export async function getconeccion(){
    try{
        /*
        Intenta conectar usando los datos de 'datosConexion'
        'await' pausa la función hasta que la conexión se complete.
        */
        return await mssql.connect(datosConexion);
    }
    catch(error){
        // si falla lanza un error 
        console.error("no se pudo realizar la conexion", error)
    }
}
export {mssql}

// este es el archivo de conexion, sirve para poder conectarse con la base de datos

