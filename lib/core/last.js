/*  last.js
    
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
    
    ---
    
    A set with a single value of the last value added to the source.
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'last', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS     = rs.RS
    , Greedy = RS.Greedy
    , log    = RS.log.bind( null, 'last' )
    , de     = false
    , ug     = log
  ;
  
  /* --------------------------------------------------------------------------
      @pipelet last( options )
      
      @short Holds the last value from @@adds-only operations
      
      @parameters
      - options (Object): pipelet options:
        - name (String): debugging name
      
      @examples
      - provide last event from a stream of add-only parsed url events:
        ```javascript
        rs
          .url_events() // adds-only stream with a "url" attribute
          .url_parse()  // parses "url" attribute into url components
          .last()       // set containing the last parsed url
        ;
        ```
      
      @description
      Forwards downstream the "last value" from upstream dataflow.
      
      This does not provide the last value based on some order.
      "Last value" means the last value received from the last received
      add or update chunk. Removes are ignored, so the last value is
      never removed and can only be replaced by a new added value.
      
      First emits an @@add operation, subsequently emits @@update operations
      to updqte the last value.
      
      This is a @@stateful, @@synchronous, @@greedy pipelet. Current state
      has zero or one value.
      
      ToDo: add tests for last()
  */
  function Last( options ) {
    var that = this;
    
    Greedy.call( that, options );
    
    // State
    that._last = [];
    
    // Intermediate state within transactions
    that._last_chunck = [];
    
    that._output.source = {
      _fetch: function( receiver ) {
        receiver( that._last, true );
      }
    };
  } // Last()
  
  Greedy.Build( 'last', Last, {
    _add: function( values, options ) {
      var that = this
        , _t   = options && options._t
        , l
        , last
        , v
      ;
      
      if( values.length ) that._last_chunck = values;
      
      if( ! _t || ! _t.more ) {
        // This is the last chunk
        values = that._last_chunck;
        that._last_chunck = [];
        
        if( l = values.length ) {
          last = that._last[ 0 ];
          that._last = [ v = values[ l - 1 ] ];
          
          if( last ) {
            that.__emit_update( [ [ last, v ] ], options );
          } else {
            that.__emit_add( [ v ], options );
          }
        } else if( _t && _t.forks ) {
          that.__emit_add( [], options );
        }
      }
    }, // _add()
    
    _remove: function( values, options ) {
      // forward end-of-transactions
      this._add( [], options );
    }, // _remove()
    
    _update: function( updates, options ) {
      var l = updates.length;
      
      // add last value and/or forward end-of-transactions
      this._add( l ? [ updates[ l - 1 ][ 1 ] ] : [], options );
    } // _update()
  } ); // Last instance methods
  
  return rs;
} ); // last.js
