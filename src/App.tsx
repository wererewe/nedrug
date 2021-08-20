import { Box, InputLabel,  LinearProgress,  makeStyles } from "@material-ui/core";
import Grid from '@material-ui/core/Grid';
import axios from 'axios';
import pickBy from "lodash/pickBy";
import React, { Fragment, useEffect, useState } from 'react';
import XMLParser from 'react-xml-parser';
import XLSX from "xlsx";
import Typography from '@material-ui/core/Typography';

const ServiceKey =   'g+gDJ8fX9NxkFUwqsYpWCe/3VlYdtrcAfYfoIz/Xbcjh5+wl+O4npiMXHrsm95hb4y0EwHRnY1YasZPCzJrCHQ=='

function App() {
  const styles = useStyles();
  const [itemNames, setItemNames] = useState<any>([])
  const [result, setResult] = useState<any>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [title, setTitle] = useState('')

  const filterData = (items: any, item_name: string) => {

    const CNSGN_MANUF = Object.values(pickBy(items, (item: any) => item.name === "CNSGN_MANUF"))
    if (!CNSGN_MANUF || !CNSGN_MANUF[0] || !CNSGN_MANUF[0].value) return;
    const CNSGN_MANUF_VALUE = CNSGN_MANUF[0].value

    const ITEM_SEQ = Object.values(pickBy(items, (item: any) => item.name === "ITEM_SEQ"))
    
    setResult((prevArray: any) => [...prevArray, {
      '품목기준코드': ITEM_SEQ[0].value,  
      '품목명': decodeURI(item_name), 
      '위탁제조업체': CNSGN_MANUF_VALUE, 
    }])
    
  }

  
  const fetchData = (async (item_name: string) => {
    const headers = {'Access-Control-Allow-Origin': '*'}
  
    const baseUrl = 'https://cors-anywhere.herokuapp.com/http://apis.data.go.kr/1471057/MdcinPrductPrmisnInfoService1/getMdcinPrductItem'; /*URL*/
    const response = await axios.get(baseUrl, {
      headers,
      params: {
        ServiceKey,
        item_name: encodeURI(item_name)
      }})
    
    const data = new XMLParser().parseFromString(response.data); 

    const items = data.getElementsByTagName('item')[0]?.children
    if (!items) return
    filterData(items, item_name)
   })



  useEffect(() => {
    if (!itemNames || !itemNames.length) { return }
    if (isLoading) return
    
    
    try {
      const fetch = async () => {
      setIsLoading(true)
      await Promise.all(itemNames.map(fetchData));
      setIsSuccess(true)
    }
    fetch()
    
      
    } catch (e) {
      console.log('error=', e)
      setIsLoading(false)
    } 

  }, [itemNames])

  const autofitColumns = (json: any[]) => {

    let objectMaxLength: number[] = [];
  
    json.map(jsonData => {
       Object.entries(jsonData)
             .map(([, v], idx) => {
                let columnValue = v as string
                objectMaxLength[idx] = objectMaxLength[idx] >= columnValue.length ? objectMaxLength[idx] : columnValue.length
             })
    })
    const wscols = objectMaxLength.map((w: number) => ({width: w*2}))
    return wscols
  }

  useEffect(() => {
    if (!isSuccess || !result?.length) return
    
    setIsLoading(false)
    
    const wb = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(result);
    const wscols = autofitColumns(result)
    worksheet["!cols"] = wscols;

    XLSX.utils.book_append_sheet(wb, worksheet, "Sheet0");

    XLSX.writeFile(wb, `[export]${title}`);

  }, [isSuccess, result])
  

  const handleFile = (file:File) => {
    setIsSuccess(false)
    setItemNames([])
    setResult([])
    setIsError(false)
    
    setTitle(file.name)
		const reader = new FileReader();
		const rABS = !!reader.readAsBinaryString;
		reader.onload = (e: any) => {
			const bstr = e.target.result;
			const workbook = XLSX.read(bstr, {type:rABS ? 'binary' : 'array'});
			const wsname = workbook.SheetNames[0];
			const ws = workbook.Sheets[wsname];
      
			const data = XLSX.utils.sheet_to_json(ws, {header:1});
      
      ws['!ref'] = `B2:B${data.length}`
      const result = XLSX.utils.sheet_to_json(ws, {header:1});
      
      setItemNames(result)
			
		};
		if(rABS) reader.readAsBinaryString(file); else reader.readAsArrayBuffer(file);
	};
  return (
  <Grid container className={styles.root}>
    <Box style={{width:'100%'}}>
    {isLoading && <LinearProgress />}
    </Box>
    <DragDropFile handleFile={handleFile}>
      <div className="row"><div className="col-xs-12">
        <DataInput handleFile={handleFile} isLoading={isLoading}/>
      </div></div>
    </DragDropFile>
  </Grid>
  )
}

const useStyles = makeStyles(theme => ({
    root: {
      height: '100vh',
      justifyContent:'center',
      backgroundColor: theme.palette.background.paper,
      flexDirection: 'row'
    },
    button: {
      width: 200,
      height: 50,
    },
    formControl: {
      border: `1px solid ${theme.palette.divider}`,
      marginTop: theme.spacing(1), 
      padding: theme.spacing(1)
    },
    info: {
      marginBottom: theme.spacing(3),
    }
}));

const DragDropFile = ({handleFile, children}: any) => {
	
	const suppress = (evt: any) => { evt.stopPropagation(); evt.preventDefault(); };
	const onDrop = (evt: any) => { evt.stopPropagation(); evt.preventDefault();
		const files = evt.dataTransfer.files;
		if(files && files[0]) handleFile(files[0]);
	};
	 return (
<div onDrop={onDrop} onDragEnter={suppress} onDragOver={suppress}>
	{children}
</div>
	);
};


/* list of supported file types */
const SheetJSFT = [
	"xlsx", "xlsb", "xlsm", "xls", "xml", "csv", "txt", "ods", "fods", "uos", "sylk", "dif", "dbf", "prn", "qpw", "123", "wb*", "wq*", "html", "htm"
].map(function(x) { return "." + x; }).join(",");


const DataInput = ({handleFile, isLoading}: any) => {
	const styles = useStyles();
	const handleChange = (e: any) => {
    const files = e.target.files;
		if(files && files[0]) handleFile(files[0]);
    
	};
	return (
    <Fragment>
      <Box className={styles.info}>
        
        <Typography>
          검색 결과 파일을 업로드 해주세요
        </Typography>
      </Box>

    <form className="form-inline">
      <Box>
        <InputLabel htmlFor="file">파일 업로드 </InputLabel>
        <input type="file" className={styles.formControl} id="file" accept={SheetJSFT} onChange={handleChange} 
        disabled={isLoading}
        onClick={(event: any)=> { 
          event.target.value = null
     }}/>
      </Box>
    </form>
    </Fragment>
	); 
}

export default App;
