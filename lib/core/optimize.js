/*  optimize.js
    
    Copyright (c) 2013-2016, Reactive Sets

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'optimize', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , log          = RS.log.bind( null, 'optimize' )
    //, extend_2     = RS.extend._2
    , value_equals = RS.value_equals
    , Pipelet      = RS.Pipelet
    //, Greedy       = RS.Greedy
    , Transaction  = RS.Transactions.Transaction
    , push         = [].push
  ;
  
  /* --------------------------------------------------------------------------
     de&&ug()
  */
  var de = false
    , ug = log
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet optimize( options )
      
      @short Optinizes @@[operations](operation) in @@[transactions](transaction) statelessly
      
      @parameters:
      - options (Object): optional @@class:Pipelet options
      
      @description:
      This pipelet emits recombined operations at the end of transactions.
      For each transaction it emit a maximum of one @@remove, one @@update,
      and one @@add operations in the same transaction, in this order.
      
      To do so, it delays operations in a transaction to consolidate add,
      renove and update operations at the end of each transaction. A remove
      and an add sharing the same @@identity are combined into an update.
      Updates having the same removed and added values are discarded.
      
      All removed values, if any, are first enitted in a @@remove operation,
      followed by all updated values, if any, in an @@update operation,
      followed by all added values, if any, in an @@add operation that
      terminates the emitted transaction.
      
      If at the end of the transaction there are no changes, it emits nothing
      unless the transaction has fork @@[tags](tag) in which case it emits
      and empty add operation to forward downstream the transaction fork tag.
      
      This is a @@stateless, @@lazy, @@transactional pipelet. It is
      @@asynchronous on @@operations in the middle of a transaction and
      @@synchronous on end-of-transaction operations.
      
      It is @@transactional because:
      - it always emits @@[semantically strict](strict) adds, removes and
        updates corresponding respectfullly to object @@create, object
        @@delete, and object strict @@update events
      - it does not require prior adds on objects to accept removes and
        updates, which is typical of transactional pipelets that emit
        change events for a database without emitting existing object
        values.
      
      If fetched it returns the state when all transactions are terminated
      in order to provide a state consitent with emitted operations. This
      works as long as upstream pipelets respond synchronously to fetch.
      
      Therefore optimize() makes transactions more atomic, i.e.
      all operations on a transaction are executed synchronously at the end
      of each transaction and fetch() are executed outside of ongoing
      transactions.
      
      It also serializes transactions, i.e. transactions operations are
      applied at the end of each transactions, so nested transactions are
      un-nested by optimize().
      
      ### To-Do List
      - ToDo: optimize() implement delayed fetches
      - ToDo: move Optimize.Input to a reusable Transaction_Aggregate.Input class
      - ToDo: add CI tests for optimize()
  */
  function Optimize( options ) {
    var that = this;
    
    that._input = that._input || new Optimize.Input( that, options.name, options.tag );
    
    Pipelet.call( that, options );
  } // Optimize()
  
  Optimize.Input = Pipelet.Input.subclass( 'Optimize.Input',
    function Optimize_Input( p, name, tag, input_transactions ) {
      Pipelet.Input.call( this, p, name, tag, input_transactions );
      
      this.transaction_events = {};
    }, // Optimize_Input()
    
    {
      emit: function( operation, values, options ) {
        var that         = this
          , transactions = that.transaction_events
          , events       = []
          , t            = options && options._t
          , tid
          , more
        ;
        
        if( t ) {
          more   = t.more;
          tid    = t.id;
          events = transactions[ tid ] = transactions[ tid ] || [];
        }
        
        values.length && events.push( [ operation, values ] );
        
        if( ! more ) {
          if( tid ) delete transactions[ tid ];
          
          that.pipelet._add( [ { id: tid, events: events } ], options )
        }
      }, // emit()
      
      add: function( values, options ) {
        this.emit( 'add', values, options );
      }, // add()
      
      remove: function( values, options ) {
        this.emit( 'remove', values, options );
      }, // remove()
      
      update: function( updates, options ) {
        this.emit( 'update', updates, options );
      } // update()
    } // Optimize.Input() instance methods
  ); // Optimize.Input
  
  Pipelet.Build( 'optimize', Optimize, {
    _add: function( values, options ) {
      var that         = this
        , events       = values[ 0 ].events
        , adds         = {} // for all identities, all adds
        , removes      = {} // for all identities, all removes
        , updates      = []
      ;
      
      // Organize all operations by value identity
      events.forEach( function( event ) {
        var name   = event[ 0 ]
          , values = event[ 1 ]
        ;
        
        switch( name ) {
          case 'add':
            values.forEach( function( v ) {
              var id = that._make_key( v );
              
              ( adds[ id ] = adds[ id ] || [] ).push( v );
            } );
          break;
          
          case 'remove':
            values.forEach( function( v ) {
               var id = that._make_key( v );
               
               ( removes[ id ] = removes[ id ] || [] ).push( v );
            } );
          break;
          
          case 'update':
            // split updates into removes and adds, these will be recombined later if they have the same identity
            values.forEach( function( update ) {
              var remove    = update[ 0 ]
                , add       = update[ 1 ]
                , remove_id = that._make_key( remove )
                , add_id    = that._make_key( add )
              ;
              
              ( adds   [ add_id    ] = adds   [ add_id    ] || [] ).push( add    );
              ( removes[ remove_id ] = removes[ remove_id ] || [] ).push( remove );
            } );
          break;
        }
      } );
      
      /*
        For each remove:
          - locate adds with the same identity
          - discard equal adds
          - make updates
          - then reduce remaining removed values as Array of removed values
      */
      removes = Object.keys( removes ).reduce( function( out, id ) {
        var removed = removes[ id ]
          , added   = adds[ id ]
          , al      = added && added.length
        ;
        
        if ( al ) {
          // Discard equal removed and added values
          removed = removed.filter( function( remove ) {
            for( var i = -1; ++i < al; ) {
              if( value_equals( remove, added[ i ] ) ) {
                // Discard this remove and add because they have the same value
                added.splice( i, 1 );
                
                --al;
                
                return false;
              }
            }
            
            return true;
          } );
          
          // make updates for all remaining removed and added value couple
          while( removed.length && added.length )
            updates.push( [ removed.shift(), added.shift() ] )
          ;
          
          // Discard these adds if empty
          if( !added.lemgth ) delete adds[ id ];
        }
        
        // reduce remaining removed values
        push.apply( out, removed );
        
        return out;
      }, [] );
      
      // Reduce adds into array of added values
      adds = Object.keys( adds ).reduce( function( out, id ) {
        push.apply( out, adds[ id ] );
        
        return out;
      }, [] );
      
      // Emits optimized adds, removes and updates into a transaction
      that.__emit_operations( adds, removes, updates, options );
    } // _add()
  } ); // optimize() instance methods
  
  /* --------------------------------------------------------------------------
      module exports
  */
  RS.add_exports( { 'Optimize': Optimize } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} ); // optimize.js
