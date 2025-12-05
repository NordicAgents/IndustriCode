/*
 * Created by EcoStruxure Automation Expert.
 * User: midxav
 * Date: 1/31/2024
 * Time: 11:06 AM
 * 
 */
using System;
using NxtControl.GuiFramework;
using NxtControl.Services;

#region Definitions;
#region #BasicSKILL_HMI;

namespace HMI.Main.Symbols.BasicSKILL
{

  public class OUTPUTEventArgs : System.EventArgs
  {
    IHMIAccessorService accessorService;
    int channelId;
    int cookie; 
    int eventIndex;

    public OUTPUTEventArgs(int channelId, int cookie, int eventIndex)
    {
      this.accessorService = (IHMIAccessorService)ServiceProvider.GetService(typeof(IHMIAccessorService));
      this.channelId = channelId;
      this.cookie = cookie;
      this.eventIndex = eventIndex;
    }
    public bool Get_OUT1(ref System.Int16 value)
    {
      if (accessorService == null)
        return false;
      System.Int64 var = 0;
      bool ret = accessorService.GetInt64Value(channelId, cookie, eventIndex, true,0, ref var);
      if (ret) value = (System.Int16) var;
      return ret;
    }

    public System.Int16? OUT1
    { get {
      if (accessorService == null)
        return null;
      System.Int64 var = 0;
      bool ret = accessorService.GetInt64Value(channelId, cookie, eventIndex, true,0, ref var);
      if (!ret) return null;
      return (System.Int16) var;
    }  }

    public bool Get_RESPONSE(ref System.String value)
    {
      if (accessorService == null)
        return false;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,1, ref var);
      if (ret) value = (System.String) var;
      return ret;
    }

    public System.String RESPONSE
    { get {
      if (accessorService == null)
        return null;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,1, ref var);
      if (!ret) return null;
      return (System.String) var;
    }  }

    public bool Get_NAME(ref System.String value)
    {
      if (accessorService == null)
        return false;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,2, ref var);
      if (ret) value = (System.String) var;
      return ret;
    }

    public System.String NAME
    { get {
      if (accessorService == null)
        return null;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,2, ref var);
      if (!ret) return null;
      return (System.String) var;
    }  }


  }

  public class SKILL_OUTPUTEventArgs : System.EventArgs
  {
    IHMIAccessorService accessorService;
    int channelId;
    int cookie; 
    int eventIndex;

    public SKILL_OUTPUTEventArgs(int channelId, int cookie, int eventIndex)
    {
      this.accessorService = (IHMIAccessorService)ServiceProvider.GetService(typeof(IHMIAccessorService));
      this.channelId = channelId;
      this.cookie = cookie;
      this.eventIndex = eventIndex;
    }
    public bool Get_CURRENT_STATE(ref System.Int16 value)
    {
      if (accessorService == null)
        return false;
      System.Int64 var = 0;
      bool ret = accessorService.GetInt64Value(channelId, cookie, eventIndex, true,0, ref var);
      if (ret) value = (System.Int16) var;
      return ret;
    }

    public System.Int16? CURRENT_STATE
    { get {
      if (accessorService == null)
        return null;
      System.Int64 var = 0;
      bool ret = accessorService.GetInt64Value(channelId, cookie, eventIndex, true,0, ref var);
      if (!ret) return null;
      return (System.Int16) var;
    }  }

    public bool Get_NAME(ref System.String value)
    {
      if (accessorService == null)
        return false;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,1, ref var);
      if (ret) value = (System.String) var;
      return ret;
    }

    public System.String NAME
    { get {
      if (accessorService == null)
        return null;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,1, ref var);
      if (!ret) return null;
      return (System.String) var;
    }  }


  }

}

namespace HMI.Main.Symbols.BasicSKILL
{

  public class INPUTEventArgs : System.EventArgs
  {
    public INPUTEventArgs()
    {
    }
    private System.Int16? IN1_field = null;
    public System.Int16? IN1
    {
       get { return IN1_field; }
       set { IN1_field = value; }
    }

  }

  public class SKILL_INPUTEventArgs : System.EventArgs
  {
    public SKILL_INPUTEventArgs()
    {
    }
    private System.Int16? SKILL_CMD_field = null;
    public System.Int16? SKILL_CMD
    {
       get { return SKILL_CMD_field; }
       set { SKILL_CMD_field = value; }
    }

  }

}

namespace HMI.Main.Symbols.BasicSKILL
{
  partial class sDefault
  {

    private event EventHandler<HMI.Main.Symbols.BasicSKILL.OUTPUTEventArgs> OUTPUT_Fired;

    private event EventHandler<HMI.Main.Symbols.BasicSKILL.SKILL_OUTPUTEventArgs> SKILL_OUTPUT_Fired;

    protected override void OnEndInit()
    {
      if (OUTPUT_Fired != null)
        AttachEventInput(0);
      if (SKILL_OUTPUT_Fired != null)
        AttachEventInput(1);

    }

    protected override void FireEventCallback(int channelId, int cookie, int eventIndex)
    {
      switch(eventIndex)
      {
        default:
          break;
        case 0:
          if (OUTPUT_Fired != null)
          {
            try
            {
              OUTPUT_Fired(this, new HMI.Main.Symbols.BasicSKILL.OUTPUTEventArgs(channelId, cookie, eventIndex));
            }
            catch (System.Exception e)
            {
              NxtControl.Services.LoggingService.ErrorFormatted(@"In Event Callback for event:'{0}' Type:'{1}' CAT:'{2}' came exception:{3}
stack Trace:
{4}","OUTPUT_Fired", this.GetType().Name, this.CATName, e.Message, e.StackTrace);
            }
          }
        break; 
        case 1:
          if (SKILL_OUTPUT_Fired != null)
          {
            try
            {
              SKILL_OUTPUT_Fired(this, new HMI.Main.Symbols.BasicSKILL.SKILL_OUTPUTEventArgs(channelId, cookie, eventIndex));
            }
            catch (System.Exception e)
            {
              NxtControl.Services.LoggingService.ErrorFormatted(@"In Event Callback for event:'{0}' Type:'{1}' CAT:'{2}' came exception:{3}
stack Trace:
{4}","SKILL_OUTPUT_Fired", this.GetType().Name, this.CATName, e.Message, e.StackTrace);
            }
          }
        break; 

      }
    }
    public bool FireEvent_INPUT(System.Int16 IN1)
    {
      return ((IHMIAccessorOutput)this).FireEvent(0, new object[] {IN1});
    }
    public bool FireEvent_INPUT(HMI.Main.Symbols.BasicSKILL.INPUTEventArgs ea)
    {
      object[] _values_ = new object[1];
      if (ea.IN1.HasValue) _values_[0] = ea.IN1.Value;
      return ((IHMIAccessorOutput)this).FireEvent(0, _values_);
    }
    public bool FireEvent_INPUT(System.Int16 IN1, bool ignore_IN1)
    {
      object[] _values_ = new object[1];
      if (!ignore_IN1) _values_[0] = IN1;
      return ((IHMIAccessorOutput)this).FireEvent(0, _values_);
    }
    public bool FireEvent_SKILL_INPUT(System.Int16 SKILL_CMD)
    {
      return ((IHMIAccessorOutput)this).FireEvent(1, new object[] {SKILL_CMD});
    }
    public bool FireEvent_SKILL_INPUT(HMI.Main.Symbols.BasicSKILL.SKILL_INPUTEventArgs ea)
    {
      object[] _values_ = new object[1];
      if (ea.SKILL_CMD.HasValue) _values_[0] = ea.SKILL_CMD.Value;
      return ((IHMIAccessorOutput)this).FireEvent(1, _values_);
    }
    public bool FireEvent_SKILL_INPUT(System.Int16 SKILL_CMD, bool ignore_SKILL_CMD)
    {
      object[] _values_ = new object[1];
      if (!ignore_SKILL_CMD) _values_[0] = SKILL_CMD;
      return ((IHMIAccessorOutput)this).FireEvent(1, _values_);
    }

  }
}
#endregion #BasicSKILL_HMI;

#endregion Definitions;
