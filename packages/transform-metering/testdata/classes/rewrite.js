const $h‍_meter_get=getGlobalMeter;const $m=$h‍_meter_set(true);$m&&$m.e();try{class Abc {
  f() {const $m = $h‍_meter_get();$m && $m.e();try {
      return doit();
    } finally {$m && $m.l();}}}
}finally{$h‍_meter_set(false);$m && $m.l();}
