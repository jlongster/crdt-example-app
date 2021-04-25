let fs = require('fs');
let command = function(filePath, queryRun){
    let initSql = fs.readFileSync(filePath, 'utf-8').split(';');
    console.log('Initializing the database');
    initSql.forEach(sql => {
        try{
            let s = sql.trim();
            if(s.length > 0) queryRun(`${s};`);
        }catch(e){
            if(e.message.indexOf('already exists')){
                console.log('Database was already intialized.');
            }else {
                throw e;
            }
        }
    });
};

module.exports = command;