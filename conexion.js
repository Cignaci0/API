import mssql from "mssql"
const datosConexion = {
    server:"aquaml.cdem84i2eeoa.us-east-2.rds.amazonaws.com",
    database :"AquaML",
    user:"cristopher",
    password:"Cristopher2003",
    options:{
        encrypt:true,
        trustServerCertificate: true
    }
};

export async function getconeccion(){
    try{
        return await mssql.connect(datosConexion);
    }
    catch(error){
        console.error("no se pudo realizar la conexion", error)
    }
}
export {mssql}
