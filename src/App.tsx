import { Box, InputLabel, LinearProgress, makeStyles } from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import axios from "axios";
import React, { Fragment, useCallback, useEffect, useState } from "react";

import XLSX from "xlsx";
import Typography from "@material-ui/core/Typography";
import { XMLParser } from "fast-xml-parser";

const ServiceKey =
  "g+gDJ8fX9NxkFUwqsYpWCe/3VlYdtrcAfYfoIz/Xbcjh5+wl+O4npiMXHrsm95hb4y0EwHRnY1YasZPCzJrCHQ==";

function App() {
  const styles = useStyles();
  const [result, setResult] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [title, setTitle] = useState("");

  const filterData = (item: any, item_name: any) => {
    setResult((prevArray: any) => [
      ...prevArray,
      {
        품목기준코드: item.ITEM_SEQ || "",
        품목명: item_name[0] || "",
        위탁제조업체: item.CNSGN_MANUF || "자사",
        전문일반: item.ETC_OTC_CODE || "",
        분류: item.CLASS_NO || "",
        성상: item.CHART || "",
        원료성분: item.MATERIAL_NAME || "",
        유효기간: item.VALID_TERM || "",
        포장단위: item.PACK_UNIT || "",
        상태: item.CANCEL_NAME || "",
        업체명: item.ENTP_NAME || "",
        유효성분: item.MAIN_ITEM_INGR || "",
      },
    ]);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchData = async (item_name: string) => {
    const baseUrl =
      "http://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService02/getDrugPrdtPrmsnDtlInq01"; /*URL*/
    const response = await axios.get(baseUrl, {
      params: {
        ServiceKey,
        item_name: encodeURI(item_name),
      },
    });
    try {
      const parser = new XMLParser();
      let data = parser.parse(response.data);

      const { items } = data.response.body;
      if (!items) {
        return;
      }
      const { item } = items;
      filterData(item, item_name);
    } catch (e) {
      console.log("error", e);
    }
  };

  const fetch = useCallback(
    async (result) => {
      const promises = async () => {
        await Promise.all(result.map(fetchData));
      };
      await promises();
      setIsSuccess(true);
    },
    [fetchData]
  );

  const autofitColumns = (json: any[]) => {
    let objectMaxLength: number[] = [];

    json.map((jsonData) => {
      return Object.entries(jsonData).map(([, v], idx) => {
        let columnValue = v as string;
        objectMaxLength[idx] =
          objectMaxLength[idx] >= columnValue.length
            ? objectMaxLength[idx]
            : columnValue.length;
      });
    });
    const wscols = objectMaxLength.map((w: number) => ({ width: w * 2 }));
    return wscols;
  };

  // create export file
  useEffect(() => {
    if (!isSuccess || !result?.length) return;

    setIsLoading(false);

    const wb = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(result);
    const wscols = autofitColumns(result);
    worksheet["!cols"] = wscols;

    XLSX.utils.book_append_sheet(wb, worksheet, "Sheet0");

    XLSX.writeFile(wb, `[export]${title}`);
  }, [isSuccess, result, title]);

  const handleFile = (file: File) => {
    setIsSuccess(false);
    setResult([]);

    setTitle(file.name);
    const reader = new FileReader();
    const rABS = !!reader.readAsBinaryString;
    reader.onload = async (e: any) => {
      setIsLoading(true);
      const bstr = e.target.result;
      const workbook = XLSX.read(bstr, { type: rABS ? "binary" : "array" });
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];

      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      ws["!ref"] = `B2:B${data.length}`;
      const result = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (!result || !result.length) return;
      await fetch(result);
    };
    if (rABS) reader.readAsBinaryString(file);
    else reader.readAsArrayBuffer(file);
  };
  return (
    <Grid container className={styles.root}>
      <Box style={{ width: "100%" }}>{isLoading && <LinearProgress />}</Box>
      <DragDropFile handleFile={handleFile}>
        <div className="row">
          <div className="col-xs-12">
            <DataInput handleFile={handleFile} isLoading={isLoading} />
          </div>
        </div>
      </DragDropFile>
    </Grid>
  );
}

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100vh",
    justifyContent: "center",
    backgroundColor: theme.palette.background.paper,
    flexDirection: "row",
  },
  button: {
    width: 200,
    height: 50,
  },
  formControl: {
    border: `1px solid ${theme.palette.divider}`,
    marginTop: theme.spacing(1),
    padding: theme.spacing(1),
  },
  info: {
    marginBottom: theme.spacing(3),
  },
}));

const DragDropFile = ({ handleFile, children }: any) => {
  const suppress = (evt: any) => {
    evt.stopPropagation();
    evt.preventDefault();
  };
  const onDrop = (evt: any) => {
    evt.stopPropagation();
    evt.preventDefault();
    const files = evt.dataTransfer.files;
    if (files && files[0]) handleFile(files[0]);
  };
  return (
    <div onDrop={onDrop} onDragEnter={suppress} onDragOver={suppress}>
      {children}
    </div>
  );
};

/* list of supported file types */
const SheetJSFT = [
  "xlsx",
  "xlsb",
  "xlsm",
  "xls",
  "xml",
  "csv",
  "txt",
  "ods",
  "fods",
  "uos",
  "sylk",
  "dif",
  "dbf",
  "prn",
  "qpw",
  "123",
  "wb*",
  "wq*",
  "html",
  "htm",
]
  .map(function (x) {
    return "." + x;
  })
  .join(",");

const DataInput = ({ handleFile, isLoading }: any) => {
  const styles = useStyles();
  const handleChange = (e: any) => {
    const files = e.target.files;
    if (files && files[0]) handleFile(files[0]);
  };
  return (
    <Fragment>
      <Box className={styles.info}>
        <Typography>검색 결과 파일을 업로드 해주세요</Typography>
      </Box>

      <form className="form-inline">
        <Box>
          <InputLabel htmlFor="file">파일 업로드 </InputLabel>
          <input
            type="file"
            className={styles.formControl}
            id="file"
            accept={SheetJSFT}
            onChange={handleChange}
            disabled={isLoading}
            onClick={(event: any) => {
              event.target.value = null;
            }}
          />
        </Box>
      </form>
    </Fragment>
  );
};

export default App;
