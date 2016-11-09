(function (){
    if (!Rx){
        console.log ("RxJS not available!!!");
        return;
    }

    window.RxHelpers = {}

    RxHelpers.ItemEmitter = function(initialval){
        var func;
        var current = initialval;
        return {
            send: function (data){
                if (func)
                    func (data);
                current=data;
            },
            onRecieve: function (f){
                func = f;
            },
            getCurrent: function (){
                return current;
            }
        }
    }
    
    RxHelpers.ReactiveValue = function (val){
        var val,oc;
        return {
            onChange: function (f){
                oc = f;
            },
            set: function (v){
                val = v;
                if (oc)
                    oc (val);
            },
            get: function (){
                return v;
            },
            toObservable: function(){
                return Rx.Observable.fromReactiveValue(this);
            }
        }
    }

    Rx.Observable.fromReactiveValue = function (ro){
        var observer;
        
        ro.onChange(function(val){
            observer.onNext(val);
        });

        return Rx.Observable.create(function(obs){
            observer = obs;
        });
    }

    Rx.Observable.fromItemEmitter = function (ro){
        var observer;
        
        ro.onRecieve(function(val){
            observer.onNext(val);
        });

        return Rx.Observable.create(function(obs){
            observer = obs;
            if (ro.getCurrent())
                observer.next(ro.getCurrent())
        });
    }

    Rx.Observable.prototype.bufferWithTimeAndCount = function (timeSpan, count){
        var source = this;
        
        var timerComponent = (function () {
            var obs;
            var isStarted = false;
            var arr = []

            return {
                emit: function (obj){
                    
                    arr.push(obj)

                    if (!isStarted){
                        isStarted = true;
                        setTimeout(function(){
                            isStarted = false;

                            if (arr.length==count)
                                obs.onNext(arr);
                            
                            arr = [];
                            
                        }, timeSpan);

                    } 
                    
                },
                setObs: function (o){
                    obs = o;
                }
            }

        })()

        return Rx.Observable.create(function(obs){
            timerComponent.setObs(obs);
            return source.subscribe(
                (n)=>{ timerComponent.emit(n); },
                (e)=>{ obs.onError(e); },
                (c)=>{ obs.onComplete(c); }
            );
            
        });

    };

    Rx.Observable.prototype.reactiveSum = function (obs2){
        var source = this;
        
        return Rx.Observable.create(function(newobs){
            
            timerComponent.setObs(obs);
            
            return source.subscribe(
                (n)=>{ timerComponent.emit(n); },
                (e)=>{ obs.onError(e); },
                (c)=>{ obs.onComplete(c); }
            );
            
        });
    };

    Rx.Observable.prototype.httpGet = function (obs2){
        var source = this;
        
        var httpComponent = (function (){
            var obs;
            var requestQueue = [];

            var isDownloading = false;
            function downloadHttp(r){
                isDownloading = true;
                $.get(r, function(data, status){
                    obs.onNext(data);
                    isDownloading = false;
                    next();
                })

            }

            function next(){
                if (!isDownloading){
                    var req = requestQueue.shift();
                    if (req){
                        if (req.isEnd)
                            obs.onCompleted();
                        else
                            downloadHttp(req.data)
                    }
                }                
            }

            function processHttp(r){
                requestQueue.push (r);
                next();
            }

            return {
                setObserver: function(o){
                    obs =o;
                },
                sendRequest: processHttp,
                triggerComplete: function(){
                    
                }
            }  
        })();

        return Rx.Observable.create(function(newObserver){
            
            httpComponent.setObserver(newObserver);
            
            return source.subscribe(
                (n)=>{
                    httpComponent.sendRequest({data : n}); 
                },
                (e)=>{ newObserver.onError(e); },
                ()=>{ httpComponent.sendRequest({isEnd: true}); }
            );
            
        });

    };

})()