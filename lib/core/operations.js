/*  operations.js
    
    Copyright (C) 2013-2015, Reactive Sets

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
( 'operations', [ './pipelet' ], function( rs ) {
  'use strict';
  
  var RS           = rs.RS
    , log          = RS.log
    , Pipelet      = RS.Pipelet
    , de           = false
    , ug           = de && log.bind( null, 'operations' )
  ;
  
  /* -------------------------------------------------------------------------------------------
     nil_method() -> Object
     
     A sink function, not doing anything other than returning "this".
  */
  function nil_method() { return this }
  
  /* -------------------------------------------------------------------------------------------
     adds( options )
     
     Forwards only "add" operations downstream, filters-out "remove" and "update" operations.
     This may be used to select operations that create objects that do not yet exist.
     
     This is a synchronous, stateless, lazy pipelet.
     
     Caveat 1: for this pipelet to work as usually intented, upstream pipelets need to emit
     change operations using the "update" operation. Some pipelets may break this by splitting
     updates into "remove" and "add" operations within a transaction. Although this is
     semantically equivalent from a state standpoint, it makes it harder to detect changes
     on existing objects and this pipelet does not attempt to consolidate remove and add
     operations into updates. Using the optimize() pipelet can reconstruct updates from removes
     and adds in a transaction at this cost of a greedy and stateful behavior for specific
     dataflows where the key is specified.
     
     Caveat 2: this will not work if update operations are used to group adds and removes
     on different objects, concealing created and removed objects into a fake change operation.
     
     Parameters:
     - options (optional Object): options for Pipelet:
       - name (String): instance debugging name
  */
  function Adds( options ) {
    Pipelet.call( this, options );
  } // Adds()
  
  Pipelet.Build( 'adds', Adds, {
    _remove: nil_method,
    _update: nil_method
  } );
  
  /* -------------------------------------------------------------------------------------------
     removes( options )
     
     Forwards only "remove" operations downstream, filters-out "add" and "update" operations.
     This may be used to select operations that remove existing objects.
     
     This is a synchronous, stateless, lazy pipelet.
     
     Caveats: check adds() caveats about split updates and fake updates that would prevent this
     pipelet to work as intented.
     
     Parameters:
     - options (optional Object): options for Pipelet:
       - name (String): instance debugging name
  */
  function Removes( options ) {
    Pipelet.call( this, options );
  } // Removes()
  
  Pipelet.Build( 'removes', Removes, {
    _add: nil_method,
    _update: nil_method
  } );
  
  /* -------------------------------------------------------------------------------------------
     updates( options )
     
     Forwards only "update" operations downstream, filters-out "add" and "remove" operations.
     This may be used to select operations that update existing objects.
     
     This is a synchronous, stateless, lazy pipelet.
     
     Caveats: check adds() caveats about split updates and fake updates that would prevent this
     pipelet to work as intented.
     
     Parameters:
     - options (optional Object): options for Pipelet:
       - name (String): instance debugging name
  */
  function Updates( options ) {
    Pipelet.call( this, options );
  } // Updates()
  
  Pipelet.Build( 'updates', Updates, {
    _add: nil_method,
    _remove: nil_method,
    
    // override default update function that splits updates
    _update: function( updates, options ) {
      return this.__emit_update( updates, options );
    }
  } );
  
  /* --------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( {
    'Adds'   : Adds,
    'Removes': Removes,
    'Updates': Updates
  } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} ); // operations.js