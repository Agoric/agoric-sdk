import React, { useEffect } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import {
  Card,
  CardHeader,
  Divider,
  TableContainer,
  TablePagination,
  Table,
  TableHead,
  TableBody,
  TableFooter,
  TableRow,
  TableCell,
  Typography,
} from '@material-ui/core';

import { useApplicationContext } from '../contexts/Application';

const useStyles = makeStyles(theme => ({
  buy: {
    color: theme.palette.success.main,
  },
  sell: {
    color: theme.palette.warning.main,
  },
}));

export default function OrderHistory() {
  const classes = useStyles();
  const { state } = useApplicationContext();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [history, setHistory] = React.useState([]);
  const { orderhistory } = state;

  useEffect(() => {
    const result = [];
    orderhistory.buys.forEach(item => result.push({ side: true, ...item }));
    orderhistory.sells.forEach(item => result.push({ side: false, ...item }));
    setHistory(result);
  }, [orderhistory]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  function getPrice(order, decimal) {
    return (order.want.extent / order.offer.extent).toFixed(decimal);
  }

  function getClass(order) {
    return order.side === true ? classes.buy : classes.sell;
  }

  return (
    <Card elevation={0}>
      <CardHeader title="Orders" />
      <Divider />
      {Array.isArray(history) && history.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="right">Side</TableCell>
                <TableCell align="right">Offer</TableCell>
                <TableCell align="right">Want</TableCell>
                <TableCell align="right">Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(order => (
                  <TableRow key={order.id}>
                    <TableCell align="right" className={getClass(order)}>
                      {order.side ? 'Buy' : ' Sell'}
                    </TableCell>
                    <TableCell align="right">{order.offer.extent}</TableCell>
                    <TableCell align="right">{order.want.extent}</TableCell>
                    <TableCell align="right">{getPrice(order, 4)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TablePagination
                  rowsPerPageOptions={[
                    25,
                    50,
                    100,
                    { label: 'All', value: -1 },
                  ]}
                  count={history.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onChangePage={handleChangePage}
                  onChangeRowsPerPage={handleChangeRowsPerPage}
                />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="inherit">No orders.</Typography>
      )}
    </Card>
  );
}
